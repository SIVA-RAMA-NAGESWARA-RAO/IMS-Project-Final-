const express = require('express');
const {
  listInterviewers,
  assignInterviewers,
  trackAssignments,
} = require('../controllers/interviewerController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', protect, allow('hr'), listInterviewers);
router.patch('/assign/:interviewId', protect, allow('hr'), assignInterviewers);
router.get('/:id/assignments', protect, trackAssignments);

module.exports = router;
