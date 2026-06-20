const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ROLES, default: 'candidate' },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    // Email OTP verification (registration gate) — account is inert until true.
    isVerified: { type: Boolean, default: false },
    // Bumped on "logout from all devices" — any refresh token signed with an
    // older tokenVersion is rejected at /auth/refresh, without needing a
    // server-side token blacklist.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const { _id, name, email, role, phone, avatarUrl, isVerified, createdAt } = this;
  return { id: _id, name, email, role, phone, avatarUrl, isVerified, createdAt };
};

module.exports = mongoose.model('User', userSchema);
