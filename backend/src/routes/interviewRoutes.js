const express = require('express');
const {
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  listInterviews,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.post('/', protect, allow('hr'), scheduleInterview);
router.get('/', protect, listInterviews);
router.patch('/:id/reschedule', protect, allow('hr'), rescheduleInterview);
router.patch('/:id/cancel', protect, allow('hr'), cancelInterview);
router.patch('/:id/complete', protect, allow('hr', 'interviewer'), completeInterview);

module.exports = router;
