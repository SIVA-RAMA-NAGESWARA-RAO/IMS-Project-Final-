const { body } = require('express-validator');
const { ROLES } = require('../config/constants');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  // 'role' intentionally removed — public registration is candidate-only.
  // HR/interviewer accounts are provisioned via POST /api/admin/invite-hr.
  body('phone').optional().trim().isLength({ max: 20 }),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').optional().isString(),
];

const otpVerifyRules = [
  body('email').trim().isEmail(),
  body('code').trim().isLength({ min: 4, max: 8 }).withMessage('Invalid verification code'),
];

const otpResendRules = [
  body('email').trim().isEmail(),
  body('purpose').isIn(['registration', 'password_reset']),
];

const resetPasswordRules = [
  body('email').trim().isEmail(),
  body('code').trim().isLength({ min: 4, max: 8 }),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

module.exports = { registerRules, loginRules, otpVerifyRules, otpResendRules, resetPasswordRules };
