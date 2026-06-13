// utils/auth-helpers.js
// Pure helper functions for auth — no DB dependencies, fully testable.
const crypto = require("crypto");
const { ValidationError } = require("./errors");

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseExpiry(str) {
  const match = String(str).match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000;
  const [, n, unit] = match;
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(n, 10) * multipliers[unit];
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters and contain at least one number or special character");
  }
  const hasNumberOrSpecial = /[0-9!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasNumberOrSpecial) {
    throw new ValidationError("Password must be at least 8 characters and contain at least one number or special character");
  }
}

module.exports = { hashToken, parseExpiry, validatePassword };
