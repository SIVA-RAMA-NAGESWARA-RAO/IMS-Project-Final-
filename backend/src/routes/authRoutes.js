const express = require('express');
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  registerRules,
  loginRules,
  otpVerifyRules,
  otpResendRules,
  resetPasswordRules,
} = require('../validators/authValidators');
const { body } = require('express-validator');

const router = express.Router();

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/verify-otp', authLimiter, otpVerifyRules, validate, verifyRegistrationOtp);
router.post('/resend-otp', authLimiter, otpResendRules, validate, resendOtp);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').trim().isEmail().normalizeEmail()],
  validate,
  forgotPassword
);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);

module.exports = router;
