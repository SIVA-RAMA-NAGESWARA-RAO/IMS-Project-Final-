const express = require('express');
const {
  inviteCandidateToSchedule,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  listInterviews,
  getInterview,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { verifyOwnership } = require('../middleware/verifyOwnership');
const { check, validationResult } = require('express-validator');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
};

const scheduleValidators = [
  check('applicationId').isMongoId().withMessage('Invalid applicationId'),
  check('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO date'),
  check('durationMinutes').optional().isInt({ min: 15 }).withMessage('durationMinutes must be at least 15'),
  check('interviewers').isArray({ min: 1 }).withMessage('interviewers must be a non-empty array'),
  validate,
];

const rescheduleValidators = [
  check('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO date'),
  validate,
];

// Core routes
router.post('/invite',      protect, allow('hr', 'admin'), inviteCandidateToSchedule);
router.post('/',            protect, allow('hr', 'admin'), scheduleValidators, scheduleInterview);
router.get('/',             protect, listInterviews);
router.get('/:id',          protect, getInterview);
router.patch('/:id/reschedule', protect, allow('hr', 'admin'), rescheduleValidators, rescheduleInterview);
router.patch('/:id/cancel',     protect, allow('hr', 'admin'), cancelInterview);
// Interviewers can only complete interviews they're assigned to
router.patch('/:id/complete',   protect, verifyOwnership('Interview', 'interviewers', { isArray: true }), completeInterview);

module.exports = router;
