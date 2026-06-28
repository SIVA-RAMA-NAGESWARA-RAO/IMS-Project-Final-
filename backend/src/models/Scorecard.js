// src/models/Scorecard.js
// Structured Interview Scorecard — inspired by Greenhouse & Lever.
// Each interviewer fills one scorecard per interview.  Scorecards are
// "blind" until all assigned interviewers submit, preventing groupthink.

const mongoose = require('mongoose');
const { RECOMMENDATION } = require('../config/constants');

const competencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },        // e.g. "Problem Solving"
    rating: { type: Number, min: 1, max: 5, required: true },  // 1=Poor … 5=Exceptional
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const scorecardSchema = new mongoose.Schema(
  {
    interview:     { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    interviewer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Structured competency ratings (configurable per job template)
    competencies: {
      type: [competencySchema],
      validate: [arr => arr.length >= 1, 'At least one competency rating is required'],
    },

    // Overall assessment
    overallRating:      { type: Number, min: 1, max: 5, required: true },
    recommendation:     { type: String, enum: RECOMMENDATION, required: true },
    strengths:          { type: String, trim: true },
    concerns:           { type: String, trim: true },
    cultureFitRating:   { type: Number, min: 1, max: 5 },
    communicationRating:{ type: Number, min: 1, max: 5 },
    technicalNotes:     { type: String, trim: true },
    additionalComments: { type: String, trim: true },

    // Blind submission control
    submittedAt:  { type: Date, default: Date.now },
    isLocked:     { type: Boolean, default: true },  // locked once submitted — no edits
  },
  { timestamps: true }
);

// One scorecard per interviewer per interview
scorecardSchema.index({ interview: 1, interviewer: 1 }, { unique: true });

module.exports = mongoose.model('Scorecard', scorecardSchema);
