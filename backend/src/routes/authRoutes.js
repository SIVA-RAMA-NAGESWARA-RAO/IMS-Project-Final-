const express = require('express');
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiters');
const {
  registerRules: registerValidator,
  loginRules: loginValidator,
  otpVerifyRules: otpVerifyValidator,
  otpResendRules: forgotPasswordValidator,
  resetPasswordRules: resetPasswordValidator,
} = require('../validators/authValidators');

const router = express.Router();

// ─── Public routes ─────────────────────────────────────────────────────────
router.post('/register',           authLimiter, registerValidator,          register);
router.post('/verify-otp',         otpLimiter,  otpVerifyValidator,         verifyRegistrationOtp);
router.post('/resend-otp',         otpLimiter,                              resendOtp);
router.post('/login',              authLimiter, loginValidator,             login);
router.post('/verify-login-otp',   otpLimiter,  otpVerifyValidator,         verifyLoginOtp);
router.post('/verify-magic-link',  otpLimiter,                              verifyMagicLink);
router.post('/forgot-password',    authLimiter, forgotPasswordValidator,    forgotPassword);
router.post('/reset-password',     otpLimiter,  resetPasswordValidator,     resetPassword);
router.post('/refresh',                                                      refresh);

// ─── Protected routes ──────────────────────────────────────────────────────
router.post('/logout',             protect, logout);
router.post('/logout-all',         protect, logoutAll);
router.get('/me',                  protect, getMe);

module.exports = router;
