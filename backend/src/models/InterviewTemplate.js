// src/models/InterviewTemplate.js
// Interview Template — like Greenhouse's "Interview Kits".
// HR defines a template per job+round that includes the evaluation criteria
// and suggested questions.  This ensures every interviewer uses the same
// framework, improving consistency and reducing bias.

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text:     { type: String, required: true, trim: true },
    category: { type: String, enum: ['technical', 'behavioral', 'situational', 'culture-fit'], default: 'technical' },
    hints:    { type: String, trim: true },  // guidance for interviewer
  },
  { _id: false }
);

const interviewTemplateSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },   // e.g. "Frontend Engineer — Round 2"
    job:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },  // null = global template
    round:       { type: Number },                               // null = any round

    // Competencies that interviewers must rate on the scorecard
    competencies: [{ type: String, trim: true }],  // e.g. ["Problem Solving", "System Design", "Communication"]

    // Suggested interview questions
    questions: [questionSchema],

    // Duration guidance
    suggestedDurationMinutes: { type: Number, default: 45 },

    // Who created this template
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

interviewTemplateSchema.index({ job: 1, round: 1 });

module.exports = mongoose.model('InterviewTemplate', interviewTemplateSchema);
