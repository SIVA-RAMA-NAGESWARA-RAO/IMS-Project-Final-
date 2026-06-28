const crypto = require('crypto');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('./emailService');

const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
const EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

const generateCode = () => {
  // Cryptographically random, zero-padded to OTP_LENGTH digits.
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, '0');
};

/**
 * Issues a fresh OTP for (email, purpose), enforcing the resend cooldown,
 * and emails it. Replaces any prior unexpired OTP for the same purpose so
 * only the most recent code is ever valid.
 */
const issueOtp = async (email, purpose) => {
  const existing = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });

  if (existing) {
    const secondsSinceLastSend = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
      const err = new Error(`Please wait ${wait}s before requesting another code.`);
      err.statusCode = 429;
      err.retryAfterSeconds = wait;
      throw err;
    }
    await existing.deleteOne();
  }

  const code = generateCode();
  await Otp.create({
    email,
    purpose,
    codeHash: Otp.hashCode(code),
    expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000),
    lastSentAt: new Date(),
  });

  // Always print OTP to console in dev so login works without SMTP
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [OTP] Code for ${email} (${purpose}): ${code}\n`);
  }

  await sendOtpEmail(email, code, purpose);
  return { expiresInMinutes: EXPIRY_MINUTES, resendCooldownSeconds: RESEND_COOLDOWN_SECONDS };
};

/**
 * Verifies a submitted code. Tracks attempts per-record and invalidates
 * the OTP after MAX_ATTEMPTS wrong guesses (brute-force protection) or
 * on a correct match (one-time use).
 */
const verifyOtp = async (email, purpose, code) => {
  const record = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });

  if (!record) {
    const err = new Error('No active verification code for this email. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    const err = new Error('Too many incorrect attempts. Please request a new code.');
    err.statusCode = 429;
    throw err;
  }

  if (!record.matches(code)) {
    record.attempts += 1;
    await record.save();
    const err = new Error('Incorrect verification code.');
    err.statusCode = 400;
    throw err;
  }

  await record.deleteOne(); // one-time use
  return true;
};

module.exports = { issueOtp, verifyOtp };
