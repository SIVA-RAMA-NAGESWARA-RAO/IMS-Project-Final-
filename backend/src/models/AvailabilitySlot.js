// src/models/AvailabilitySlot.js
// Candidate Self-Scheduling — like Calendly / YouCanBook.me.
// Interviewers publish available time blocks.  When scheduling an interview,
// candidates (or HR on their behalf) pick from these pre-approved windows.

const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime:   { type: Date, required: true },
    endTime:     { type: Date, required: true },
    timezone:    { type: String, default: 'Asia/Kolkata' },

    // Booking status
    isBooked:  { type: Boolean, default: false },
    bookedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // candidate or HR
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },  // linked once booked

    // Recurrence (optional — weekly repeating slots)
    isRecurring:  { type: Boolean, default: false },
    recurringDay: { type: Number, min: 0, max: 6 },  // 0=Sunday … 6=Saturday
  },
  { timestamps: true }
);

// Fast lookup: available slots for a given interviewer in a date range
availabilitySlotSchema.index({ interviewer: 1, startTime: 1, isBooked: 1 });

module.exports = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
