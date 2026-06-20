const express = require('express');
const {
  submitFeedback,
  getFeedbackForInterview,
  getFeedbackForApplication,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { submitFeedbackRules } = require('../validators/feedbackValidators');

const router = express.Router();

router.post('/', protect, allow('interviewer'), submitFeedbackRules, validate, submitFeedback);
router.get('/interview/:interviewId', protect, getFeedbackForInterview);
router.get('/application/:applicationId', protect, allow('hr'), getFeedbackForApplication);

module.exports = router;
