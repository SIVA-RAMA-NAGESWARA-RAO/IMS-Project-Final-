// src/controllers/availabilityController.js
// Candidate Self-Scheduling — Calendly-style availability management.
// Interviewers publish available time blocks; candidates pick slots.

const asyncHandler = require('express-async-handler');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Interview = require('../models/Interview');
const { logAction } = require('../utils/audit');

// ─── Interviewer: publish available time slots ──────────────────────────────
// POST /api/availability
const publishSlots = asyncHandler(async (req, res) => {
  const { slots } = req.body;  // [{ startTime, endTime, timezone?, isRecurring?, recurringDay? }]

  if (!Array.isArray(slots) || !slots.length) {
    res.status(400);
    throw new Error('slots must be a non-empty array of { startTime, endTime }');
  }

  const created = [];
  for (const slot of slots) {
    const s = await AvailabilitySlot.create({
      interviewer: req.user._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone || 'Asia/Kolkata',
      isRecurring: slot.isRecurring || false,
      recurringDay: slot.recurringDay,
    });
    created.push(s);
  }

  await logAction({ req, action: 'availability_published', entityType: 'AvailabilitySlot', entityId: created[0]._id, metadata: { count: created.length } });

  res.status(201).json({ count: created.length, slots: created });
});

// ─── Get available (unbooked) slots for interviewer(s) in a date range ──────
// GET /api/availability?interviewerId=...&from=...&to=...
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { interviewerId, from, to } = req.query;

  const filter = { isBooked: false };

  if (interviewerId) {
    // Can be comma-separated for panel interviews
    const ids = interviewerId.split(',').map(id => id.trim());
    filter.interviewer = { $in: ids };
  }
  if (from) filter.startTime = { $gte: new Date(from) };
  if (to) {
    filter.endTime = filter.endTime || {};
    filter.endTime = { $lte: new Date(to) };
  }

  const slots = await AvailabilitySlot.find(filter)
    .populate('interviewer', 'name email')
    .sort({ startTime: 1 });

  res.json(slots);
});

// ─── Book a slot (candidate self-scheduling or HR on behalf) ────────────────
// PATCH /api/availability/:slotId/book
const bookSlot = asyncHandler(async (req, res) => {
  const { interviewId } = req.body;  // optional – link to a specific interview

  const slot = await AvailabilitySlot.findById(req.params.slotId);
  if (!slot) {
    res.status(404);
    throw new Error('Slot not found');
  }
  if (slot.isBooked) {
    res.status(409);
    throw new Error('This slot has already been booked');
  }

  slot.isBooked = true;
  slot.bookedBy = req.user._id;
  if (interviewId) slot.interview = interviewId;
  await slot.save();

  // If linked to an interview, update the interview's scheduledAt
  if (interviewId) {
    await Interview.findByIdAndUpdate(interviewId, {
      scheduledAt: slot.startTime,
      durationMinutes: Math.round((slot.endTime - slot.startTime) / 60000),
    });
  }

  await logAction({ req, action: 'slot_booked', entityType: 'AvailabilitySlot', entityId: slot._id });

  res.json(slot);
});

// ─── Interviewer: delete an unbooked slot ───────────────────────────────────
// DELETE /api/availability/:slotId
const deleteSlot = asyncHandler(async (req, res) => {
  const slot = await AvailabilitySlot.findById(req.params.slotId);
  if (!slot) {
    res.status(404);
    throw new Error('Slot not found');
  }
  if (slot.interviewer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only delete your own slots');
  }
  if (slot.isBooked) {
    res.status(400);
    throw new Error('Cannot delete a booked slot — cancel the interview first');
  }

  await slot.deleteOne();
  res.json({ message: 'Slot deleted' });
});

// ─── Interviewer: get my own slots ──────────────────────────────────────────
// GET /api/availability/me
const getMySlots = asyncHandler(async (req, res) => {
  const slots = await AvailabilitySlot.find({ interviewer: req.user._id })
    .sort({ startTime: 1 });
  res.json(slots);
});

module.exports = { publishSlots, getAvailableSlots, bookSlot, deleteSlot, getMySlots };
