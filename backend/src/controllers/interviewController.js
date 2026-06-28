const asyncHandler = require('express-async-handler');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const notify = require('../utils/notify');
const { pushEvent } = require('../utils/analyticsClient');
const { fetchFreeSlots } = require('../services/calendarService');
const { createMeeting } = require('../services/videoService');
const { logAction } = require('../utils/audit');
const { sendInterviewScheduledEmail } = require('../services/emailService');

// @desc Invite candidate to pick an interview slot via Magic Link (Workflow 1)
// @route POST /api/interviews/invite
const inviteCandidateToSchedule = asyncHandler(async (req, res) => {
  const { applicationId, interviewers, durationMinutes = 60, round, mode } = req.body;

  const application = await Application.findById(applicationId)
    .populate('candidate', 'name email')
    .populate('job', 'title');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const jwt = require('jsonwebtoken');
  const user = await require('../models/User').findById(application.candidate._id);
  const token = jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  const { sendMagicLinkEmail } = require('../services/emailService');
  await sendMagicLinkEmail(user.email, token);

  application.pushStatus('Interview Invited (Pending Candidate Selection)', req.user._id, 'Sent magic link for self-scheduling');
  application.status = 'Interview Scheduled';
  await application.save();

  res.status(200).json({
    message: `Candidate invited successfully. Magic link sent to ${user.email}`,
  });
});

// @desc Schedule an interview for an application (Module 5)
// @route POST /api/interviews
const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    applicationId, round, scheduledAt, durationMinutes = 60,
    mode, location, meetingLink, interviewers,
  } = req.body;

  // 1. Load application
  const application = await Application.findById(applicationId)
    .populate('candidate', 'name email')
    .populate('job', 'title');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  // 2. Check interviewer availability
  if (Array.isArray(interviewers) && interviewers.length) {
    const end = new Date(
      new Date(scheduledAt).getTime() + durationMinutes * 60_000
    ).toISOString();
    try {
      const slots = await fetchFreeSlots(
        interviewers.map((id) => ({ _id: id, email: id })),
        { start: scheduledAt, end }
      );
      const conflict = slots.find((s) => s.busy && s.busy.length);
      if (conflict) {
        res.status(409);
        throw new Error(`Interviewer ${conflict.interviewer} is not available at the requested time`);
      }
    } catch (calErr) {
      if (calErr.statusCode === 409) throw calErr;
      console.warn('[interview] Calendar check failed (non-blocking):', calErr.message);
    }
  }

  // 3. Auto-generate a meeting link when none is supplied
  let finalMeetingLink = meetingLink || null;
  let meetingStartUrl = null;
  let meetingSource = 'manual';

  if (!finalMeetingLink && mode !== 'in-person') {
    try {
      const meeting = await createMeeting({
        topic: `${application.job.title} – Round ${round || (application.currentRound || 0) + 1}`,
        startTime: scheduledAt,
        duration: durationMinutes,
      });
      finalMeetingLink = meeting.joinUrl;
      meetingStartUrl = meeting.startUrl || meeting.joinUrl;
      meetingSource = meeting.source;
      console.log(`[interview] Meeting created via ${meetingSource}: ${finalMeetingLink}`);
    } catch (meetErr) {
      console.error('[interview] Meeting creation failed (interview saved without link):', meetErr.message);
    }
  }

  // 4. Persist the interview record
  const interview = await Interview.create({
    application: applicationId,
    round: round || (application.currentRound || 0) + 1,
    scheduledAt,
    durationMinutes,
    mode,
    location,
    meetingLink: finalMeetingLink,
    meetingStartUrl,           // host-only start link (Zoom)
    meetingSource,
    interviewers,
    scheduledBy: req.user._id,
  });

  // 5. Update application status & notify participants
  application.status = 'Interview Scheduled';
  application.currentRound = interview.round;
  application.statusHistory.push({ status: 'Interview Scheduled', changedBy: req.user._id });
  await application.save();

  await notify({
    user: application.candidate._id,
    type: 'interview_reminder',
    title: 'Interview scheduled',
    message: `Your interview (round ${interview.round}) is scheduled for ${new Date(scheduledAt).toLocaleString()}. ${finalMeetingLink ? `Join here: ${finalMeetingLink}` : ''}`,
    meta: { interviewId: interview._id },
  });

  await sendInterviewScheduledEmail(
    application.candidate.email,
    application.job.title,
    scheduledAt,
    false,
    finalMeetingLink
  );

  for (const interviewerId of interviewers || []) {
    await notify({
      user: interviewerId,
      type: 'interview_reminder',
      title: 'New interview assigned',
      message: `You have been assigned to an interview on ${new Date(scheduledAt).toLocaleString()}.`,
      meta: { interviewId: interview._id },
    });
  }

  await logAction({
    req,
    action: 'interview_scheduled',
    entityType: 'Interview',
    entityId: interview._id,
  });
  await pushEvent('interview_scheduled', {
    interviewId: interview._id,
    applicationId,
    round: interview.round,
    meetingSource,
  });

  res.status(201).json(interview);
});

// @desc Reschedule an interview
// @route PATCH /api/interviews/:id/reschedule
const rescheduleInterview = asyncHandler(async (req, res) => {
  const { scheduledAt, regenerateMeeting = false } = req.body;
  const interview = await Interview.findById(req.params.id).populate({
    path: 'application',
    populate: [
      { path: 'candidate', select: 'email' },
      { path: 'job', select: 'title' },
    ],
  });
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  interview.rescheduledFrom = interview.scheduledAt;
  interview.scheduledAt = scheduledAt;
  interview.status = 'rescheduled';

  // Optionally regenerate meeting link on reschedule
  if (regenerateMeeting && interview.meetingSource !== 'manual') {
    try {
      const meeting = await createMeeting({
        topic: `Interview – Round ${interview.round}`,
        startTime: scheduledAt,
        duration: interview.durationMinutes,
      });
      interview.meetingLink = meeting.joinUrl;
      interview.meetingStartUrl = meeting.startUrl || meeting.joinUrl;
      interview.meetingSource = meeting.source;
    } catch (meetErr) {
      console.warn('[interview] Meeting regeneration failed:', meetErr.message);
    }
  }

  await interview.save();

  if (interview.application?.candidate?.email) {
    await sendInterviewScheduledEmail(
      interview.application.candidate.email,
      interview.application.job.title,
      scheduledAt,
      true,
      interview.meetingLink
    );
  }

  await logAction({ req, action: 'interview_rescheduled', entityType: 'Interview', entityId: interview._id });
  await pushEvent('interview_rescheduled', { interviewId: interview._id, scheduledAt });

  res.json(interview);
});

// @desc Cancel an interview slot
// @route PATCH /api/interviews/:id/cancel
const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled' },
    { new: true }
  );
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  // Notify candidate of cancellation
  const populated = await Interview.findById(interview._id).populate({
    path: 'application',
    populate: [{ path: 'candidate', select: '_id name email' }, { path: 'job', select: 'title' }],
  });
  if (populated?.application?.candidate?._id) {
    await notify({
      user: populated.application.candidate._id,
      type: 'interview_reminder',
      title: 'Interview cancelled',
      message: `Your scheduled interview for ${populated.application.job?.title || 'the role'} has been cancelled. HR will be in touch to reschedule.`,
      meta: { interviewId: interview._id },
    });
  }

  await logAction({ req, action: 'interview_cancelled', entityType: 'Interview', entityId: interview._id });
  res.json(interview);
});

// @desc Mark an interview as completed
// @route PATCH /api/interviews/:id/complete
const completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { status: 'completed' },
    { new: true }
  );
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }
  await logAction({ req, action: 'interview_completed', entityType: 'Interview', entityId: interview._id });
  res.json(interview);
});

// @desc List interviews with role-based filtering
// @route GET /api/interviews
const listInterviews = asyncHandler(async (req, res) => {
  const { applicationId, status, from, to, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (applicationId) filter.application = applicationId;
  if (status) filter.status = status;
  if (from || to) {
    filter.scheduledAt = {};
    if (from) filter.scheduledAt.$gte = new Date(from);
    if (to)   filter.scheduledAt.$lte = new Date(to);
  }

  if (req.user.role === 'interviewer') {
    filter.interviewers = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .populate('interviewers', 'name email')
      .populate({
        path: 'application',
        populate: [
          { path: 'candidate', select: 'name email' },
          { path: 'job', select: 'title' },
        ],
      })
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Interview.countDocuments(filter),
  ]);

  // Candidates may only see their own interviews
  const visible =
    req.user.role === 'candidate'
      ? interviews.filter(
          (iv) =>
            iv.application?.candidate?._id?.toString() === req.user._id.toString()
        )
      : interviews;

  res.json({
    interviews: visible,
    total: req.user.role === 'candidate' ? visible.length : total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// @desc Get a single interview by ID
// @route GET /api/interviews/:id
const getInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate('interviewers', 'name email')
    .populate({
      path: 'application',
      populate: [
        { path: 'candidate', select: 'name email' },
        { path: 'job', select: 'title' },
      ],
    });
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  // Permission check: candidates can only see their own
  if (
    req.user.role === 'candidate' &&
    interview.application?.candidate?._id?.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Access denied');
  }

  res.json(interview);
});

module.exports = {
  inviteCandidateToSchedule,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  listInterviews,
  getInterview,
};
