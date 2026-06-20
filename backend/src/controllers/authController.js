const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const CandidateProfile = require('../models/Candidate');
const { issueOtp, verifyOtp } = require('../services/otpService');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} = require('../utils/tokens');
const { logAction } = require('../utils/audit');

const issueSession = async (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  return accessToken;
};

// @desc Step 1 of registration: create an unverified account and email an OTP.
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, role: role || 'candidate', phone, isVerified: false });

  if (user.role === 'candidate') {
    await CandidateProfile.create({ user: user._id });
  }

  const { expiresInMinutes, resendCooldownSeconds } = await issueOtp(email, 'registration');
  await logAction({ req, user: user._id, action: 'register', entityType: 'User', entityId: user._id });

  res.status(201).json({
    message: 'Account created. Check your email for a verification code.',
    email: user.email,
    expiresInMinutes,
    resendCooldownSeconds,
  });
});

// @desc Step 2 of registration: verify the emailed OTP and activate the account.
// @route POST /api/auth/verify-otp
const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('No account found for this email');
  }
  if (user.isVerified) {
    res.status(400);
    throw new Error('This account is already verified — please log in.');
  }

  await verifyOtp(email, 'registration', code); // throws (with statusCode) on failure

  user.isVerified = true;
  await user.save();

  const accessToken = await issueSession(res, user);
  await logAction({ req, user: user._id, action: 'verify_otp', entityType: 'User', entityId: user._id });

  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Resend a registration or password-reset OTP, subject to a cooldown.
// @route POST /api/auth/resend-otp
const resendOtp = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;

  if (!['registration', 'password_reset'].includes(purpose)) {
    res.status(400);
    throw new Error('purpose must be "registration" or "password_reset"');
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal account existence either way.
    return res.json({ message: 'If that account exists, a new code has been sent.' });
  }
  if (purpose === 'registration' && user.isVerified) {
    res.status(400);
    throw new Error('This account is already verified — please log in.');
  }

  const result = await issueOtp(email, purpose); // throws 429 if still in cooldown
  res.json({ message: 'A new verification code has been sent.', ...result });
});

// @desc Authenticate with email + password. Blocked until the account is OTP-verified.
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email before logging in.');
  }

  const accessToken = await issueSession(res, user);
  await logAction({ req, user: user._id, action: 'login', entityType: 'User', entityId: user._id });

  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Exchange a valid refresh-token cookie for a new access token (and rotated refresh cookie).
// @route POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.status(401);
    throw new Error('Refresh token invalid or expired');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    clearRefreshCookie(res);
    res.status(401);
    throw new Error('Session is no longer valid — please log in again');
  }

  const accessToken = await issueSession(res, user); // rotates the refresh token too
  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Log out of the current device only (clears this device's refresh cookie).
// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearRefreshCookie(res);
  res.json({ message: 'Logged out.' });
});

// @desc Log out of every device by invalidating all previously issued refresh tokens.
// @route POST /api/auth/logout-all
const logoutAll = asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  clearRefreshCookie(res);
  await logAction({ req, action: 'logout_all', entityType: 'User', entityId: req.user._id });
  res.json({ message: 'Logged out of all devices.' });
});

// @desc Get the logged-in user's profile
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// @desc Request a password-reset OTP (does not reveal whether the email exists).
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    await issueOtp(user.email, 'password_reset');
  }
  res.json({ message: 'If that account exists, a verification code has been sent.' });
});

// @desc Complete a password reset using the OTP sent to the user's email.
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('Invalid request');
  }

  await verifyOtp(email, 'password_reset', code); // throws on bad/expired code

  user.password = newPassword;
  user.tokenVersion += 1; // reset invalidates every existing session, by design
  await user.save();

  await logAction({ req, user: user._id, action: 'password_reset', entityType: 'User', entityId: user._id });

  res.json({ message: 'Password updated. Please log in again.' });
});

module.exports = {
  register,
  verifyRegistrationOtp,
  resendOtp,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
};
