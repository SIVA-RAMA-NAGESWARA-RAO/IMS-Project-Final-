const asyncHandler = require('express-async-handler');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const notify = require('../utils/notify');
const { pushEvent } = require('../utils/analyticsClient');
const { logAction } = require('../utils/audit');
const { sendInterviewScheduledEmail } = require('../services/emailService');

// @desc Schedule an interview for an application (Module 5)
// @route POST /api/interviews
const scheduleInterview = asyncHandler(async (req, res) => {
  const { applicationId, round, scheduledAt, durationMinutes, mode, location, meetingLink, interviewers } = req.body;

  const application = await Application.findById(applicationId).populate('candidate', 'name email').populate('job', 'title');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const interview = await Interview.create({
    application: applicationId,
    round: round || (application.currentRound || 0) + 1,
    scheduledAt,
    durationMinutes,
    mode,
    location,
    meetingLink,
    interviewers,
    scheduledBy: req.user._id,
  });

  application.status = 'Interview Scheduled';
  application.currentRound = interview.round;
  application.statusHistory.push({ status: 'Interview Scheduled', changedBy: req.user._id });
  await application.save();

  await notify({
    user: application.candidate._id,
    type: 'interview_reminder',
    title: 'Interview scheduled',
    message: `Your interview (round ${interview.round}) is scheduled for ${new Date(scheduledAt).toLocaleString()}.`,
    meta: { interviewId: interview._id },
  });
  await sendInterviewScheduledEmail(application.candidate.email, application.job.title, scheduledAt);

  for (const interviewerId of interviewers || []) {
    await notify({
      user: interviewerId,
      type: 'interview_reminder',
      title: 'New interview assigned',
      message: `You have been assigned to an interview on ${new Date(scheduledAt).toLocaleString()}.`,
      meta: { interviewId: interview._id },
    });
  }

  await logAction({ req, action: 'interview_scheduled', entityType: 'Interview', entityId: interview._id });
  await pushEvent('interview_scheduled', { interviewId: interview._id, applicationId, round: interview.round });

  res.status(201).json(interview);
});

// @desc Reschedule an interview (Module 5)
// @route PATCH /api/interviews/:id/reschedule
const rescheduleInterview = asyncHandler(async (req, res) => {
  const { scheduledAt } = req.body;
  const interview = await Interview.findById(req.params.id).populate({
    path: 'application',
    populate: [{ path: 'candidate', select: 'email' }, { path: 'job', select: 'title' }],
  });
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  interview.rescheduledFrom = interview.scheduledAt;
  interview.scheduledAt = scheduledAt;
  interview.status = 'rescheduled';
  await interview.save();

  if (interview.application?.candidate?.email) {
    await sendInterviewScheduledEmail(interview.application.candidate.email, interview.application.job.title, scheduledAt, true);
  }

  await logAction({ req, action: 'interview_rescheduled', entityType: 'Interview', entityId: interview._id });
  await pushEvent('interview_rescheduled', { interviewId: interview._id, scheduledAt });

  res.json(interview);
});

// @desc Cancel an interview slot
// @route PATCH /api/interviews/:id/cancel
const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }
  res.json(interview);
});

// @desc Mark an interview as completed
// @route PATCH /api/interviews/:id/complete
const completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }
  res.json(interview);
});

// @desc List interviews — candidate sees their own, interviewer sees assigned, HR sees all/filtered (Module 5 & 6)
// @route GET /api/interviews
const listInterviews = asyncHandler(async (req, res) => {
  const { applicationId } = req.query;
  const filter = {};
  if (applicationId) filter.application = applicationId;

  if (req.user.role === 'interviewer') {
    filter.interviewers = req.user._id;
  }

  let query = Interview.find(filter)
    .populate('interviewers', 'name email')
    .populate({
      path: 'application',
      populate: [{ path: 'candidate', select: 'name email' }, { path: 'job', select: 'title' }],
    })
    .sort({ scheduledAt: 1 });

  const interviews = await query;

  // Candidates may only see interviews tied to their own applications.
  const visible =
    req.user.role === 'candidate'
      ? interviews.filter((iv) => iv.application?.candidate?._id?.toString() === req.user._id.toString())
      : interviews;

  res.json(visible);
});

module.exports = {
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  listInterviews,
};
