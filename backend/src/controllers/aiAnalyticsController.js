/**
 * AI Analytics Controller — Natural Language → MongoDB Aggregation.
 *
 * Provides both AI-driven query translation and pre-built aggregation
 * endpoints for the HR Analytics Dashboard charts.
 */
const asyncHandler = require('express-async-handler');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getLLM, safeLLMInvoke, ANALYTICS_SYSTEM_PROMPT } = require('../config/aiConfig');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Job = require('../models/Job');
const CandidateProfile = require('../models/Candidate');
const Offer = require('../models/Offer');
const mongoose = require('mongoose');

// ─── Static fallback data for when LLM is unavailable ────────────────────────
const FALLBACK_ANALYTICS = {
  answer: 'AI analytics is temporarily unavailable. Showing cached summary data.',
  chartData: [],
  chartType: 'bar',
  pipeline: [],
  fallback: true,
};

/**
 * @desc  Translate a natural language question into a MongoDB aggregation and execute it.
 * @route POST /api/ai/analytics
 * @body  { question: string }
 */
const queryAnalytics = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    res.status(400);
    throw new Error('question is required');
  }

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(ANALYTICS_SYSTEM_PROMPT),
        new HumanMessage(question.trim()),
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(content);

      if (!parsed.collection || !Array.isArray(parsed.pipeline)) {
        throw new Error('Invalid pipeline response');
      }

      // SECURITY: Reject write operations in the pipeline.
      const pipelineStr = JSON.stringify(parsed.pipeline);
      if (/\$out|\$merge|\$delete|\$update/i.test(pipelineStr)) {
        throw new Error('Write operations are not allowed in analytics queries');
      }

      // Execute the aggregation with a timeout.
      const Model = mongoose.model(
        parsed.collection.charAt(0).toUpperCase() + parsed.collection.slice(1).replace(/s$/, '')
      );

      let data;
      try {
        data = await Model.aggregate(parsed.pipeline).option({ maxTimeMS: 10000 });
      } catch (aggErr) {
        // If the AI-generated pipeline is invalid, return the error gracefully.
        return {
          answer: `Query understood but aggregation failed: ${aggErr.message}`,
          chartData: [],
          chartType: parsed.chartType || 'bar',
          pipeline: parsed.pipeline,
          fallback: false,
        };
      }

      return {
        answer: parsed.description || 'Query executed successfully.',
        chartData: data,
        chartType: parsed.chartType || 'bar',
        pipeline: parsed.pipeline,
        fallback: false,
      };
    },
    FALLBACK_ANALYTICS,
    20000 // 20s for complex aggregations
  );

  res.json(result);
});

/**
 * @desc  Get recruitment funnel data — counts per application status.
 * @route GET /api/ai/analytics/funnel
 */
const getFunnelData = asyncHandler(async (req, res) => {
  const pipeline = [
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];

  const raw = await Application.aggregate(pipeline);

  // Order by recruitment funnel stages.
  const stageOrder = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Offer Released'];
  const funnelData = stageOrder.map((stage) => {
    const match = raw.find((r) => r._id === stage);
    return { stage, count: match ? match.count : 0 };
  });

  res.json({ chartType: 'funnel', data: funnelData });
});

/**
 * @desc  Compare candidate skills vs job requirements for radar chart.
 * @route POST /api/ai/analytics/skill-match
 * @body  { jobId: string, candidateId: string }
 */
const getSkillMatch = asyncHandler(async (req, res) => {
  const { jobId, candidateId } = req.body;

  if (!jobId || !candidateId) {
    res.status(400);
    throw new Error('jobId and candidateId are required');
  }

  const [job, profile] = await Promise.all([
    Job.findById(jobId).lean(),
    CandidateProfile.findOne({ user: candidateId }).lean(),
  ]);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }
  if (!profile) {
    res.status(404);
    throw new Error('Candidate profile not found');
  }

  // Build unified skill set from both job requirements and candidate skills.
  const allSkills = [...new Set([
    ...(job.skillsRequired || []).map((s) => s.toLowerCase()),
    ...(profile.skills || []).map((s) => s.toLowerCase()),
  ])];

  const radarData = allSkills.map((skill) => ({
    skill: skill.charAt(0).toUpperCase() + skill.slice(1),
    required: (job.skillsRequired || []).some((s) => s.toLowerCase() === skill) ? 100 : 0,
    candidate: (profile.skills || []).some((s) => s.toLowerCase() === skill) ? 100 : 0,
  }));

  res.json({ chartType: 'radar', data: radarData, jobTitle: job.title });
});

/**
 * @desc  Calculate time-to-hire trends (monthly average days from application to offer).
 * @route GET /api/ai/analytics/time-to-hire
 */
const getTimeToHire = asyncHandler(async (req, res) => {
  // Join offers with applications to calculate days between creation and offer.
  const pipeline = [
    {
      $lookup: {
        from: 'applications',
        localField: 'application',
        foreignField: '_id',
        as: 'app',
      },
    },
    { $unwind: '$app' },
    {
      $project: {
        month: { $dateToString: { format: '%Y-%m', date: '$sentAt' } },
        daysToHire: {
          $divide: [
            { $subtract: ['$sentAt', '$app.createdAt'] },
            1000 * 60 * 60 * 24, // Convert ms to days
          ],
        },
      },
    },
    {
      $group: {
        _id: '$month',
        avgDays: { $avg: '$daysToHire' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 12 }, // Last 12 months
  ];

  const raw = await Offer.aggregate(pipeline);

  const data = raw.map((r) => ({
    month: r._id,
    avgDays: Math.round(r.avgDays * 10) / 10,
    hires: r.count,
  }));

  res.json({ chartType: 'line', data });
});

/**
 * @desc  Department-wise hiring summary.
 * @route GET /api/ai/analytics/department-summary
 */
const getDepartmentSummary = asyncHandler(async (req, res) => {
  const pipeline = [
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'jobData',
      },
    },
    { $unwind: '$jobData' },
    {
      $group: {
        _id: '$jobData.department',
        totalApplications: { $sum: 1 },
        selected: {
          $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
        },
      },
    },
    { $sort: { totalApplications: -1 } },
  ];

  const data = await Application.aggregate(pipeline);

  res.json({
    chartType: 'bar',
    data: data.map((d) => ({
      department: d._id || 'Unspecified',
      totalApplications: d.totalApplications,
      selected: d.selected,
      rejected: d.rejected,
    })),
  });
});

module.exports = {
  queryAnalytics,
  getFunnelData,
  getSkillMatch,
  getTimeToHire,
  getDepartmentSummary,
};
