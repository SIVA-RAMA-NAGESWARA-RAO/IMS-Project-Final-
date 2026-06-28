const express = require('express');
const {
  submitScorecard,
  getScorecardsForInterview,
  getScorecardsForApplication,
} = require('../controllers/scorecardController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// Interviewers/HR/Admin submit scorecards
router.post('/', protect, allow('hr', 'interviewer', 'admin'), submitScorecard);

// Get scorecards for a specific interview (blind until all submitted)
router.get('/interview/:interviewId', protect, allow('hr', 'admin', 'interviewer'), getScorecardsForInterview);

// Get all scorecards across rounds for an application (HR review)
router.get('/application/:applicationId', protect, allow('hr', 'admin'), getScorecardsForApplication);

module.exports = router;
