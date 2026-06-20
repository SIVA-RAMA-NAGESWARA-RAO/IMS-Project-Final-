const mongoose = require('mongoose');
const { INTERVIEW_MODE, INTERVIEW_STATUS } = require('../config/constants');

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    round: { type: Number, default: 1 },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45 },
    mode: { type: String, enum: INTERVIEW_MODE, default: 'video' },
    location: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: INTERVIEW_STATUS, default: 'scheduled' },
    rescheduledFrom: { type: Date },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

interviewSchema.index({ application: 1 });
interviewSchema.index({ interviewers: 1, scheduledAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
