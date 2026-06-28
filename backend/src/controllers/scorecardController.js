// src/controllers/scorecardController.js
// Structured Scorecard CRUD — Greenhouse-style blind evaluation.
// Interviewers submit scorecards; HR cannot see individual cards until
// ALL assigned interviewers have submitted (preventing bias cascading).

const asyncHandler = require('express-async-handler');
const Scorecard = require('../models/Scorecard');
const Interview = require('../models/Interview');
const { logAction } = require('../utils/audit');
const { pushEvent } = require('../utils/analyticsClient');
const notify = require('../utils/notify');

// ─── Submit a scorecard (Interviewer) ───────────────────────────────────────
// POST /api/scorecards
const submitScorecard = asyncHandler(async (req, res) => {
  const {
    interviewId,
    competencies,
    overallRating,
    recommendation,
    strengths,
    concerns,
    cultureFitRating,
    communicationRating,
    technicalNotes,
    additionalComments,
  } = req.body;

  const interview = await Interview.findById(interviewId).populate('interviewers', '_id');
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  // Verify caller is an assigned interviewer
  const isAssigned = interview.interviewers.some(
    (iv) => iv._id.toString() === req.user._id.toString()
  );
  if (!isAssigned) {
    res.status(403);
    throw new Error('You are not assigned to this interview');
  }

  const scorecard = await Scorecard.create({
    interview: interviewId,
    interviewer: req.user._id,
    competencies,
    overallRating,
    recommendation,
    strengths,
    concerns,
    cultureFitRating,
    communicationRating,
    technicalNotes,
    additionalComments,
  });

  // Check if ALL assigned interviewers have now submitted
  const submittedCount = await Scorecard.countDocuments({ interview: interviewId });
  const totalInterviewers = interview.interviewers.length;
  const allSubmitted = submittedCount >= totalInterviewers;

  if (allSubmitted) {
    // Mark interview as completed
    interview.status = 'completed';
    await interview.save();

    // Auto transition Application to "Feedback Complete" (Workflow 2)
    const Application = require('../models/Application');
    const application = await Application.findById(interview.application);
    if (application) {
      application.status = 'Feedback Complete';
      application.pushStatus('Feedback Complete', req.user._id, 'All interviewers have submitted their scorecards.');
      await application.save();
    }

    // Notify HR that all scorecards are in
    await notify({
      user: interview.scheduledBy,
      type: 'scorecard_complete',
      title: 'All scorecards submitted',
      message: `All ${totalInterviewers} interviewers have submitted their scorecards for Interview #${interview._id}.`,
      meta: { interviewId: interview._id },
    });
  }

  await logAction({
    req,
    action: 'scorecard_submitted',
    entityType: 'Scorecard',
    entityId: scorecard._id,
    metadata: { interviewId, overallRating, recommendation },
  });
  await pushEvent('scorecard_submitted', {
    scorecardId: scorecard._id,
    interviewId,
    overallRating,
    recommendation,
  });

  res.status(201).json({
    scorecard,
    meta: { submittedCount, totalInterviewers, allSubmitted },
  });
});

// ─── Get scorecards for an interview (HR only — blind until all submitted) ──
// GET /api/scorecards/interview/:interviewId
const getScorecardsForInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.interviewId);
  if (!interview) {
    res.status(404);
    throw new Error('Interview not found');
  }

  const totalInterviewers = interview.interviewers.length;
  const scorecards = await Scorecard.find({ interview: req.params.interviewId })
    .populate('interviewer', 'name email');
  const submittedCount = scorecards.length;
  const allSubmitted = submittedCount >= totalInterviewers;

  // Blind submission: if caller is HR/admin and not all submitted, show summary only
  if (!allSubmitted && ['hr', 'admin'].includes(req.user.role)) {
    return res.json({
      blind: true,
      message: `${submittedCount}/${totalInterviewers} scorecards submitted. Full details will be visible once all interviewers submit.`,
      submittedCount,
      totalInterviewers,
      submittedBy: scorecards.map((sc) => ({
        interviewer: sc.interviewer,
        submittedAt: sc.submittedAt,
      })),
    });
  }

  // Interviewers can see only their own scorecard
  if (req.user.role === 'interviewer') {
    const myCard = scorecards.find(
      (sc) => sc.interviewer._id.toString() === req.user._id.toString()
    );
    return res.json({ scorecards: myCard ? [myCard] : [], submittedCount, totalInterviewers });
  }

  // All submitted → HR/Admin sees everything
  // Calculate aggregate stats
  const avgOverall = (
    scorecards.reduce((sum, sc) => sum + sc.overallRating, 0) / submittedCount
  ).toFixed(2);

  const recommendations = scorecards.reduce((acc, sc) => {
    acc[sc.recommendation] = (acc[sc.recommendation] || 0) + 1;
    return acc;
  }, {});

  res.json({
    blind: false,
    scorecards,
    submittedCount,
    totalInterviewers,
    aggregate: {
      averageOverallRating: Number(avgOverall),
      recommendations,
    },
  });
});

// ─── Get scorecard summary for an entire application (across rounds) ────────
// GET /api/scorecards/application/:applicationId
const getScorecardsForApplication = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ application: req.params.applicationId })
    .select('_id round scheduledAt interviewers')
    .sort({ round: 1 });

  const results = [];
  for (const iv of interviews) {
    const scorecards = await Scorecard.find({ interview: iv._id })
      .populate('interviewer', 'name email');
    const allSubmitted = scorecards.length >= iv.interviewers.length;

    results.push({
      interviewId: iv._id,
      round: iv.round,
      scheduledAt: iv.scheduledAt,
      totalInterviewers: iv.interviewers.length,
      submittedCount: scorecards.length,
      allSubmitted,
      scorecards: allSubmitted ? scorecards : [],
      averageRating: allSubmitted && scorecards.length
        ? Number((scorecards.reduce((s, sc) => s + sc.overallRating, 0) / scorecards.length).toFixed(2))
        : null,
    });
  }

  res.json(results);
});

module.exports = { submitScorecard, getScorecardsForInterview, getScorecardsForApplication };
