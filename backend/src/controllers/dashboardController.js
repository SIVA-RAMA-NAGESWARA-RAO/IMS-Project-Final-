// src/controllers/dashboardController.js
// Professional-grade recruitment analytics dashboard — inspired by
// Greenhouse's pipeline analytics, Lever's time-to-hire reports, and
// HireVue's interviewer workload tracking.

const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Scorecard = require('../models/Scorecard');
const Job = require('../models/Job');
const Offer = require('../models/Offer');
const User = require('../models/User');

// ─── Pipeline Overview (Kanban counts by status) ────────────────────────────
// GET /api/dashboard/pipeline?jobId=...
const getPipelineOverview = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.jobId) match.job = req.query.jobId;

  const pipeline = await Application.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Also get total
  const total = pipeline.reduce((s, stage) => s + stage.count, 0);

  res.json({ stages: pipeline, total });
});

// ─── Time-to-Hire Analytics ─────────────────────────────────────────────────
// GET /api/dashboard/time-to-hire?jobId=...&from=...&to=...
const getTimeToHire = asyncHandler(async (req, res) => {
  const match = { status: { $in: ['Selected', 'Offer Released'] } };
  if (req.query.jobId) match.job = req.query.jobId;
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
  }

  const applications = await Application.find(match).select('createdAt updatedAt statusHistory');

  if (!applications.length) {
    return res.json({ averageDays: 0, medianDays: 0, count: 0, distribution: [] });
  }

  const durations = applications.map((app) => {
    const start = new Date(app.createdAt);
    const end = new Date(app.updatedAt);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)); // days
  });

  durations.sort((a, b) => a - b);
  const avg = (durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1);
  const median = durations[Math.floor(durations.length / 2)];

  // Distribution buckets: 0-7, 8-14, 15-30, 31-60, 60+
  const buckets = [
    { label: '0-7 days', min: 0, max: 7, count: 0 },
    { label: '8-14 days', min: 8, max: 14, count: 0 },
    { label: '15-30 days', min: 15, max: 30, count: 0 },
    { label: '31-60 days', min: 31, max: 60, count: 0 },
    { label: '60+ days', min: 61, max: Infinity, count: 0 },
  ];
  durations.forEach((d) => {
    const bucket = buckets.find((b) => d >= b.min && d <= b.max);
    if (bucket) bucket.count++;
  });

  res.json({
    averageDays: Number(avg),
    medianDays: median,
    count: durations.length,
    distribution: buckets,
  });
});

// ─── Interview Conversion Funnel ────────────────────────────────────────────
// GET /api/dashboard/funnel?jobId=...
const getConversionFunnel = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.jobId) match.job = req.query.jobId;

  const totalApps = await Application.countDocuments(match);
  const shortlisted = await Application.countDocuments({ ...match, status: { $in: ['Shortlisted', 'Interview Scheduled', 'Selected', 'Offer Released'] } });
  const interviewed = await Application.countDocuments({ ...match, status: { $in: ['Interview Scheduled', 'Selected', 'Offer Released'] } });
  const selected = await Application.countDocuments({ ...match, status: { $in: ['Selected', 'Offer Released'] } });
  const offered = await Application.countDocuments({ ...match, status: 'Offer Released' });

  const funnel = [
    { stage: 'Applied', count: totalApps, rate: 100 },
    { stage: 'Shortlisted', count: shortlisted, rate: totalApps ? Math.round((shortlisted / totalApps) * 100) : 0 },
    { stage: 'Interviewed', count: interviewed, rate: totalApps ? Math.round((interviewed / totalApps) * 100) : 0 },
    { stage: 'Selected', count: selected, rate: totalApps ? Math.round((selected / totalApps) * 100) : 0 },
    { stage: 'Offered', count: offered, rate: totalApps ? Math.round((offered / totalApps) * 100) : 0 },
  ];

  res.json(funnel);
});

// ─── Interviewer Workload & Performance ─────────────────────────────────────
// GET /api/dashboard/interviewer-workload?from=...&to=...
const getInterviewerWorkload = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.from || req.query.to) {
    match.scheduledAt = {};
    if (req.query.from) match.scheduledAt.$gte = new Date(req.query.from);
    if (req.query.to) match.scheduledAt.$lte = new Date(req.query.to);
  }

  // Interviews per interviewer
  const workload = await Interview.aggregate([
    { $match: match },
    { $unwind: '$interviewers' },
    {
      $group: {
        _id: '$interviewers',
        totalInterviews: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        upcoming: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
      },
    },
    { $sort: { totalInterviews: -1 } },
  ]);

  // Enrich with user names
  const userIds = workload.map((w) => w._id);
  const users = await User.find({ _id: { $in: userIds } }).select('name email');
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const enriched = workload.map((w) => ({
    interviewer: userMap[w._id.toString()] || { _id: w._id },
    ...w,
    completionRate: w.totalInterviews
      ? Math.round((w.completed / w.totalInterviews) * 100)
      : 0,
  }));

  res.json(enriched);
});

// ─── Offer Acceptance Rate ──────────────────────────────────────────────────
// GET /api/dashboard/offer-stats?from=...&to=...
const getOfferStats = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
  }

  const total = await Offer.countDocuments(match);
  const accepted = await Offer.countDocuments({ ...match, status: 'accepted' });
  const rejected = await Offer.countDocuments({ ...match, status: 'rejected' });
  const pending = await Offer.countDocuments({ ...match, status: 'pending' });
  const expired = await Offer.countDocuments({ ...match, status: 'expired' });

  res.json({
    total,
    accepted,
    rejected,
    pending,
    expired,
    acceptanceRate: total ? Math.round((accepted / total) * 100) : 0,
  });
});

// ─── Active Jobs Overview ───────────────────────────────────────────────────
// GET /api/dashboard/jobs-overview
const getJobsOverview = asyncHandler(async (req, res) => {
  const openJobs = await Job.countDocuments({ status: 'open' });
  const closedJobs = await Job.countDocuments({ status: 'closed' });

  // Applications per job (top 10)
  const topJobs = await Application.aggregate([
    {
      $group: {
        _id: '$job',
        applicationCount: { $sum: 1 },
      },
    },
    { $sort: { applicationCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'jobs',
        localField: '_id',
        foreignField: '_id',
        as: 'jobInfo',
      },
    },
    { $unwind: { path: '$jobInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        applicationCount: 1,
        title: '$jobInfo.title',
        status: '$jobInfo.status',
        department: '$jobInfo.department',
      },
    },
  ]);

  res.json({ openJobs, closedJobs, topJobs });
});

// ─── Overall KPI Summary (single API for dashboard hero cards) ──────────────
// GET /api/dashboard/kpi
const getKPISummary = asyncHandler(async (req, res) => {
  const [
    totalApplications,
    activeInterviews,
    pendingOffers,
    openPositions,
    totalCandidates,
    completedInterviews,
  ] = await Promise.all([
    Application.countDocuments(),
    Interview.countDocuments({ status: 'scheduled' }),
    Offer.countDocuments({ status: 'pending' }),
    Job.countDocuments({ status: 'open' }),
    User.countDocuments({ role: 'candidate' }),
    Interview.countDocuments({ status: 'completed' }),
  ]);

  // This week's activity
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [newAppsThisWeek, interviewsThisWeek] = await Promise.all([
    Application.countDocuments({ createdAt: { $gte: weekAgo } }),
    Interview.countDocuments({ scheduledAt: { $gte: weekAgo } }),
  ]);

  res.json({
    totalApplications,
    activeInterviews,
    completedInterviews,
    pendingOffers,
    openPositions,
    totalCandidates,
    thisWeek: {
      newApplications: newAppsThisWeek,
      interviews: interviewsThisWeek,
    },
  });
});

module.exports = {
  getPipelineOverview,
  getTimeToHire,
  getConversionFunnel,
  getInterviewerWorkload,
  getOfferStats,
  getJobsOverview,
  getKPISummary,
};
