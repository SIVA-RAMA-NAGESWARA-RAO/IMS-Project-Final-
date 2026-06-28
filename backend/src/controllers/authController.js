const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
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
  const { name, email, password, phone } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name, email, password, role: 'candidate', phone, isVerified: false,
  });

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

  await verifyOtp(email, 'registration', code);

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

  if (!['registration', 'password_reset', 'login'].includes(purpose)) {
    res.status(400);
    throw new Error('purpose must be "registration", "password_reset", or "login"');
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'If that account exists, a new code has been sent.' });
  }
  if (purpose === 'registration' && user.isVerified) {
    res.status(400);
    throw new Error('This account is already verified — please log in.');
  }

  const result = await issueOtp(email, purpose);
  res.json({ message: 'A new verification code has been sent.', ...result });
});

// @desc Login with email + password (staff) or email only (candidates → OTP login)
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  // Candidates login via OTP only
  if (user.role === 'candidate') {
    if (!user.isVerified) {
      res.status(403);
      throw new Error('Please verify your email before logging in.');
    }
    const { resendCooldownSeconds } = await issueOtp(user.email, 'login');
    const tempToken = jwt.sign({ tempId: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    await logAction({ req, user: user._id, action: 'login_otp_sent', entityType: 'User', entityId: user._id });
    return res.json({
      requiresOtp: true,
      tempToken,
      resendCooldownSeconds,
      message: 'A sign-in code has been sent to your email.',
    });
  }

  // Staff (admin / hr / interviewer): password check first, then OTP MFA
  if (!password || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const { resendCooldownSeconds } = await issueOtp(user.email, 'login');
  const tempToken = jwt.sign({ tempId: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  await logAction({ req, user: user._id, action: 'login_mfa_started', entityType: 'User', entityId: user._id });

  res.json({
    requiresOtp: true,
    tempToken,
    resendCooldownSeconds,
    message: 'An OTP has been sent to your email. Please verify to complete login.',
  });
});

// @desc Verify login OTP and issue session tokens
// @route POST /api/auth/verify-login-otp
const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;

  if (!tempToken || !code) {
    res.status(400);
    throw new Error('Temp token and code are required');
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Session expired. Please log in again.');
  }

  const user = await User.findById(decoded.tempId);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Invalid user account');
  }

  await verifyOtp(user.email, 'login', code);

  const accessToken = await issueSession(res, user);
  await logAction({ req, user: user._id, action: 'login_success', entityType: 'User', entityId: user._id });

  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Verify a magic link token (sent via email to candidates)
// @route POST /api/auth/verify-magic-link
const verifyMagicLink = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error('Magic link token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error('This link has expired or is invalid. Please request a new one.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Account not found or has been deactivated');
  }

  // Validate tokenVersion to invalidate old magic links after password reset
  if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
    res.status(401);
    throw new Error('This link has already been used. Please request a new one.');
  }

  const accessToken = await issueSession(res, user);
  await logAction({ req, user: user._id, action: 'magic_link_login', entityType: 'User', entityId: user._id });

  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Refresh access token using httpOnly cookie
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

  const accessToken = await issueSession(res, user);
  res.json({ user: user.toSafeObject(), accessToken });
});

// @desc Logout current device
// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearRefreshCookie(res);
  res.json({ message: 'Logged out.' });
});

// @desc Logout all devices (invalidates all refresh tokens)
// @route POST /api/auth/logout-all
const logoutAll = asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  clearRefreshCookie(res);
  await logAction({ req, action: 'logout_all', entityType: 'User', entityId: req.user._id });
  res.json({ message: 'Logged out of all devices.' });
});

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// @desc Request password-reset OTP
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    await issueOtp(user.email, 'password_reset');
  }
  // Always respond the same to prevent email enumeration
  res.json({ message: 'If that account exists, a verification code has been sent.' });
});

// @desc Complete password reset using OTP
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('Invalid request');
  }

  await verifyOtp(email, 'password_reset', code);

  user.password = newPassword;
  user.tokenVersion += 1; // invalidates all existing sessions
  await user.save();

  await logAction({ req, user: user._id, action: 'password_reset', entityType: 'User', entityId: user._id });
  res.json({ message: 'Password updated. Please log in again.' });
});

module.exports = {
  register,
  verifyRegistrationOtp,
  resendOtp,
  login,
  verifyLoginOtp,
  verifyMagicLink,
  refresh,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
};
