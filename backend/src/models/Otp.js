const mongoose = require('mongoose');
const crypto = require('crypto');

// One-time-password records for registration verification and password
// reset. The raw code is never stored — only a SHA-256 hash — so a
// database leak doesn't hand out usable codes.
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['registration', 'password_reset', 'login'], required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB automatically deletes the document once expiresAt
// passes, so expired OTPs never linger for an attacker to find.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.statics.hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

otpSchema.methods.matches = function (code) {
  return this.codeHash === mongoose.model('Otp').hashCode(code);
};

module.exports = mongoose.model('Otp', otpSchema);
