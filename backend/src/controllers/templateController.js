// src/controllers/templateController.js
// Interview Kit / Template CRUD — inspired by Greenhouse's Interview Kits.
// HR creates reusable templates per job+round with evaluation criteria
// and question banks.

const asyncHandler = require('express-async-handler');
const InterviewTemplate = require('../models/InterviewTemplate');
const { logAction } = require('../utils/audit');

// ─── Create a template ─────────────────────────────────────────────────────
// POST /api/templates
const createTemplate = asyncHandler(async (req, res) => {
  const { name, jobId, round, competencies, questions, suggestedDurationMinutes } = req.body;

  const template = await InterviewTemplate.create({
    name,
    job: jobId || null,
    round: round || null,
    competencies: competencies || [],
    questions: questions || [],
    suggestedDurationMinutes: suggestedDurationMinutes || 45,
    createdBy: req.user._id,
  });

  await logAction({ req, action: 'template_created', entityType: 'InterviewTemplate', entityId: template._id });

  res.status(201).json(template);
});

// ─── List templates (optionally filter by job/round) ────────────────────────
// GET /api/templates?jobId=...&round=...
const listTemplates = asyncHandler(async (req, res) => {
  const { jobId, round } = req.query;
  const filter = { isActive: true };
  if (jobId) filter.job = jobId;
  if (round) filter.round = Number(round);

  const templates = await InterviewTemplate.find(filter)
    .populate('job', 'title')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json(templates);
});

// ─── Get single template ────────────────────────────────────────────────────
// GET /api/templates/:id
const getTemplate = asyncHandler(async (req, res) => {
  const template = await InterviewTemplate.findById(req.params.id)
    .populate('job', 'title')
    .populate('createdBy', 'name');

  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  res.json(template);
});

// ─── Update a template ─────────────────────────────────────────────────────
// PUT /api/templates/:id
const updateTemplate = asyncHandler(async (req, res) => {
  const { name, competencies, questions, suggestedDurationMinutes, isActive } = req.body;

  const template = await InterviewTemplate.findById(req.params.id);
  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  if (name !== undefined) template.name = name;
  if (competencies !== undefined) template.competencies = competencies;
  if (questions !== undefined) template.questions = questions;
  if (suggestedDurationMinutes !== undefined) template.suggestedDurationMinutes = suggestedDurationMinutes;
  if (isActive !== undefined) template.isActive = isActive;

  await template.save();

  await logAction({ req, action: 'template_updated', entityType: 'InterviewTemplate', entityId: template._id });

  res.json(template);
});

// ─── Delete (soft-deactivate) a template ────────────────────────────────────
// DELETE /api/templates/:id
const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await InterviewTemplate.findById(req.params.id);
  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  template.isActive = false;
  await template.save();

  res.json({ message: 'Template deactivated' });
});

module.exports = { createTemplate, listTemplates, getTemplate, updateTemplate, deleteTemplate };
