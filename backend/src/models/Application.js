const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

const applicationSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    resumeSnapshotUrl: { type: String },
    anonymizedResumeText: { type: String },
    aiMatchScore: { type: Number, min: 0, max: 100 },
    coverNote: { type: String },
    status: { type: String, enum: APPLICATION_STATUS, default: 'Applied' },
    currentRound: { type: Number, default: 0 },
    statusHistory: [
      {
        status: { type: String, enum: APPLICATION_STATUS },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

// One application per candidate per job.
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

applicationSchema.methods.pushStatus = function (status, changedBy, note) {
  this.status = status;
  this.statusHistory.push({ status, changedBy, note, changedAt: new Date() });
};

module.exports = mongoose.model('Application', applicationSchema);
