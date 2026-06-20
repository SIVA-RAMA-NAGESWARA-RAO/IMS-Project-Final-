const mongoose = require('mongoose');

// Extends a User (role: 'candidate') with recruitment-specific profile data.
const candidateProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    experienceYears: { type: Number, default: 0 },
    education: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    resumeUrl: { type: String },
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);
