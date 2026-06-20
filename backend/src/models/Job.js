const mongoose = require('mongoose');
const { JOB_STATUS } = require('../config/constants');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    department: { type: String, trim: true },
    location: { type: String, trim: true },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship'], default: 'full-time' },
    skillsRequired: [{ type: String, trim: true }],
    experienceRequired: { type: String, trim: true },
    salaryRange: { type: String, trim: true },
    status: { type: String, enum: JOB_STATUS, default: 'open' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text', skillsRequired: 'text' });

jobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
