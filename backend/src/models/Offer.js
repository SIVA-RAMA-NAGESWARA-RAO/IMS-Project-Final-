const mongoose = require('mongoose');
const { OFFER_STATUS } = require('../config/constants');

const offerSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    salary: { type: String, required: true },
    designation: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    offerLetterUrl: { type: String },
    status: { type: String, enum: OFFER_STATUS, default: 'pending' },
    sentAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    isBackup: { type: Boolean, default: false },
    onboardingInitiated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

offerSchema.index({ status: 1 });

module.exports = mongoose.model('Offer', offerSchema);
