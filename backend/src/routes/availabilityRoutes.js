const express = require('express');
const {
  publishSlots,
  getAvailableSlots,
  bookSlot,
  deleteSlot,
  getMySlots,
} = require('../controllers/availabilityController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// Interviewers publish their available time blocks
router.post('/', protect, allow('hr', 'interviewer', 'admin'), publishSlots);

// Anyone authenticated can view available slots (candidates pick slots)
router.get('/', protect, getAvailableSlots);

// Interviewers view their own slots
router.get('/me', protect, allow('hr', 'interviewer', 'admin'), getMySlots);

// Book a slot (candidate self-scheduling or HR on behalf)
router.patch('/:slotId/book', protect, bookSlot);

// Interviewers delete their own unbooked slots
router.delete('/:slotId', protect, allow('hr', 'interviewer', 'admin'), deleteSlot);

module.exports = router;
