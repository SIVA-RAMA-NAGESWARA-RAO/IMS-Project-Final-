const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Interview = require('../models/Interview');

// @desc List all interviewer accounts (for HR to assign panels) (Module 6)
// @route GET /api/interviewers
const listInterviewers = asyncHandler(async (req, res) => {
  const interviewers = await User.find({ role: 'interviewer', isActive: true }).select('name email phone');
  res.json(interviewers);
});

// @desc Assign one or more interviewers to an existing interview (Module 6)
// @route PATCH /api/interviewers/assign/:interviewId
const assignInterviewers = asyncHandler(async (req, res) => {
  const { interviewerIds } = req.body;
  const interview = await Interview.findByIdAndUpdate(
    req.params.interviewId,
    { $addToSet: { interviewers: { $each: interviewerIds } } },
    { new: true }
  ).populate('interviewers', 'name email');

  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }
  res.json(interview);
});

// @desc Track interview assignments for a given interviewer (Module 6)
// @route GET /api/interviewers/:id/assignments
const trackAssignments = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ interviewers: req.params.id })
    .populate({ path: 'application', populate: { path: 'job', select: 'title' } })
    .sort({ scheduledAt: 1 });
  res.json(interviews);
});

module.exports = { listInterviewers, assignInterviewers, trackAssignments };
