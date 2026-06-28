const rateLimit = require('express-rate-limit');

// Generous global ceiling — mainly to blunt scraping/DoS
const globalLimiter = rateLimit({
  windowMs: (Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

// Tight limiter for credential-guessing surfaces: login, register
const authLimiter = rateLimit({
  windowMs: (Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Separate OTP limiter — slightly more generous (verify + resend flows)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { message: 'Too many OTP requests. Please wait before trying again.' },
});

// AI endpoints — allow reasonable usage without DoS risk
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { message: 'AI rate limit reached. Please wait a moment.' },
});

module.exports = { globalLimiter, authLimiter, otpLimiter, aiLimiter };
