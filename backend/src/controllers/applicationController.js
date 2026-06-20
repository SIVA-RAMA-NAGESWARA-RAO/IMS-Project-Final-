const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Job = require('../models/Job');
const notify = require('../utils/notify');
const { pushEvent } = require('../utils/analyticsClient');
const { logAction } = require('../utils/audit');
const { sendApplicationSubmittedEmail, sendStatusUpdateEmail } = require('../services/emailService');

// @desc Candidate applies to a job (Module 4)
// @route POST /api/applications
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, resumeSnapshotUrl, coverNote } = req.body;

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') {
    res.status(400);
    throw new Error('This job is not currently accepting applications');
  }

  const exists = await Application.findOne({ candidate: req.user._id, job: jobId });
  if (exists) {
    res.status(409);
    throw new Error('You have already applied to this job');
  }

  const application = await Application.create({
    candidate: req.user._id,
    job: jobId,
    resumeSnapshotUrl,
    coverNote,
    status: 'Applied',
    statusHistory: [{ status: 'Applied', changedBy: req.user._id }],
  });

  await sendApplicationSubmittedEmail(req.user.email, job.title);
  await logAction({ req, action: 'application_created', entityType: 'Application', entityId: application._id });
  await pushEvent('application_created', { applicationId: application._id, jobId, candidateId: req.user._id });

  res.status(201).json(application);
});

// @desc Candidate: view my applications (Module 1 — candidate dashboard)
// @route GET /api/applications/mine
const myApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidate: req.user._id })
    .populate('job', 'title department location status')
    .sort({ createdAt: -1 });
  res.json(applications);
});

// @desc HR: review/list applications, optionally filtered by job or status (Module 4)
// @route GET /api/applications?jobId=&status=&page=&limit=
const listApplications = asyncHandler(async (req, res) => {
  const { jobId, status } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (jobId) filter.job = jobId;
  if (status) filter.status = status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('candidate', 'name email phone')
      .populate('job', 'title department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  res.json({ applications, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// @desc Get a single application with full status history
// @route GET /api/applications/:id
const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('candidate', 'name email phone')
    .populate('job', 'title department location')
    .populate('statusHistory.changedBy', 'name role');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }
  res.json(application);
});

// @desc HR: shortlist / reject / update an application's status directly (Module 4 & 8)
// @route PATCH /api/applications/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const application = await Application.findById(req.params.id).populate('candidate', 'name email').populate('job', 'title');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  application.pushStatus(status, req.user._id, note);
  await application.save();

  await notify({
    user: application.candidate._id,
    type: 'status_update',
    title: 'Application status updated',
    message: `Your application status changed to "${status}".`,
    meta: { applicationId: application._id, status },
  });

  await sendStatusUpdateEmail(application.candidate.email, application.job.title, status);
  await logAction({
    req,
    action: 'application_status_changed',
    entityType: 'Application',
    entityId: application._id,
    metadata: { status },
  });

  await pushEvent('application_status_changed', {
    applicationId: application._id,
    status,
    changedBy: req.user._id,
  });

  res.json(application);
});

module.exports = { applyToJob, myApplications, listApplications, getApplication, updateStatus };
