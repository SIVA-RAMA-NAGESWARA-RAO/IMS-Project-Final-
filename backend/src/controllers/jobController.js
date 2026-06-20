const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const { logAction } = require('../utils/audit');

// @desc Create a job opening (Module 3)
// @route POST /api/jobs
const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...req.body, postedBy: req.user._id, status: 'open' });
  await logAction({ req, action: 'job_created', entityType: 'Job', entityId: job._id });
  res.status(201).json(job);
});

// @desc List job openings — open jobs by default; HR can pass status=all
// @route GET /api/jobs?status=&q=&department=&page=&limit=
const listJobs = asyncHandler(async (req, res) => {
  const { status, q, department } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (status && status !== 'all') filter.status = status;
  else if (!status) filter.status = 'open'; // candidates only see open roles by default

  if (department) filter.department = department;
  if (q) filter.$text = { $search: q };

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  res.json({ jobs, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// @desc Get a single job
// @route GET /api/jobs/:id
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.json(job);
});

// @desc Edit job details (Module 3)
// @route PUT /api/jobs/:id
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  res.json(job);
});

// @desc Close a job position (Module 3)
// @route PATCH /api/jobs/:id/close
const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    { status: 'closed', closedAt: new Date() },
    { new: true }
  );
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  await logAction({ req, action: 'job_closed', entityType: 'Job', entityId: job._id });
  res.json(job);
});

module.exports = { createJob, listJobs, getJob, updateJob, closeJob };
