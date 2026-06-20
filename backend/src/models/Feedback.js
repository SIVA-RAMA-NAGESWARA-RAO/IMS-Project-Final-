const mongoose = require('mongoose');
const { RECOMMENDATION } = require('../config/constants');

const feedbackSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    recommendation: { type: String, enum: RECOMMENDATION, required: true },
    strengths: { type: String },
    concerns: { type: String },
    comments: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
