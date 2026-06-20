const rateLimit = require('express-rate-limit');

// Generous global ceiling — mainly to blunt scraping/DoS, not normal usage.
const globalLimiter = rateLimit({
  windowMs: (Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

// Tight limiter for credential-guessing surfaces: login, register, OTP verify/resend.
const authLimiter = rateLimit({
  windowMs: (Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by email when present so one IP can't lock out every account behind a NAT,
  // while still rate-limiting per-account brute force.
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { message: 'Too many attempts. Please try again later.' },
});

module.exports = { globalLimiter, authLimiter };
