const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const { pushEvent } = require('../utils/analyticsClient');

// @desc Interviewer submits evaluation feedback for an interview (Module 7)
// @route POST /api/feedback
const submitFeedback = asyncHandler(async (req, res) => {
  const { interviewId, rating, recommendation, strengths, concerns, comments } = req.body;

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  const feedback = await Feedback.create({
    interview: interviewId,
    interviewer: req.user._id,
    rating,
    recommendation,
    strengths,
    concerns,
    comments,
  });

  interview.status = 'completed';
  await interview.save();

  await pushEvent('feedback_submitted', {
    feedbackId: feedback._id,
    interviewId,
    interviewerId: req.user._id,
    rating,
    recommendation,
  });

  res.status(201).json(feedback);
});

// @desc Get feedback for a given interview
// @route GET /api/feedback/interview/:interviewId
const getFeedbackForInterview = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ interview: req.params.interviewId }).populate('interviewer', 'name email');
  res.json(feedback);
});

// @desc Get all feedback for an application across rounds (HR review)
// @route GET /api/feedback/application/:applicationId
const getFeedbackForApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId);
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const Interviews = await Interview.find({ application: application._id }).select('_id round');
  const interviewIds = Interviews.map((iv) => iv._id);

  const feedback = await Feedback.find({ interview: { $in: interviewIds } })
    .populate('interviewer', 'name email')
    .populate('interview', 'round scheduledAt');

  res.json(feedback);
});

module.exports = { submitFeedback, getFeedbackForInterview, getFeedbackForApplication };
