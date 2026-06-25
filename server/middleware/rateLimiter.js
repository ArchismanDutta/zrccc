// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

const RL_OPTS = { standardHeaders: true, legacyHeaders: false };

// Global guard — 500 req / 15 min per IP
const apiLimiter = rateLimit({
  ...RL_OPTS,
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many requests — try again later" } },
});

// Sensitive auth endpoints — 30 req / 15 min per IP
const loginLimiter = rateLimit({
  ...RL_OPTS,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many attempts — wait 15 minutes" } },
});

// Token refresh — 60 req / 15 min per IP (silent background refreshes must fit)
const refreshLimiter = rateLimit({
  ...RL_OPTS,
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many refresh attempts — try again later" } },
});

// Real-time messaging — 60 messages / minute per IP
const messageLimiter = rateLimit({
  ...RL_OPTS,
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Slow down — message rate limit exceeded" } },
});

module.exports = { apiLimiter, loginLimiter, refreshLimiter, messageLimiter };
