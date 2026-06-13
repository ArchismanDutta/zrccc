// tests/auth.test.js
// Unit tests for pure auth helper functions (no DB required).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { hashToken, parseExpiry, validatePassword } = require("../utils/auth-helpers");

// ── hashToken ────────────────────────────────────────────────
test("hashToken: produces consistent SHA-256 hex for a known string", () => {
  const raw = "abc123";
  const expected = crypto.createHash("sha256").update("abc123").digest("hex");
  assert.equal(hashToken(raw), expected);
});

test("hashToken: same input always yields same output", () => {
  const token = "some-refresh-token-value";
  assert.equal(hashToken(token), hashToken(token));
});

test("hashToken: different inputs yield different outputs", () => {
  assert.notEqual(hashToken("token-a"), hashToken("token-b"));
});

test("hashToken: output is a 64-character hex string (SHA-256)", () => {
  const result = hashToken("test-value");
  assert.match(result, /^[0-9a-f]{64}$/);
});

// ── parseExpiry ──────────────────────────────────────────────
test("parseExpiry: converts 15m to 900000ms", () => {
  assert.equal(parseExpiry("15m"), 15 * 60 * 1000);
});

test("parseExpiry: converts 7d to 604800000ms", () => {
  assert.equal(parseExpiry("7d"), 7 * 24 * 60 * 60 * 1000);
});

test("parseExpiry: converts 1h to 3600000ms", () => {
  assert.equal(parseExpiry("1h"), 60 * 60 * 1000);
});

test("parseExpiry: converts 30s to 30000ms", () => {
  assert.equal(parseExpiry("30s"), 30 * 1000);
});

test("parseExpiry: returns 15m default for invalid format", () => {
  assert.equal(parseExpiry("invalid"), 15 * 60 * 1000);
  assert.equal(parseExpiry(""), 15 * 60 * 1000);
  assert.equal(parseExpiry(null), 15 * 60 * 1000);
});

// ── validatePassword ─────────────────────────────────────────
test("validatePassword: throws on undefined/null password", () => {
  assert.throws(
    () => validatePassword(undefined),
    (err) => {
      assert.equal(err.constructor.name, "ValidationError");
      assert.match(err.message, /at least 8 characters/);
      return true;
    }
  );
});

test("validatePassword: throws on password shorter than 8 chars", () => {
  assert.throws(
    () => validatePassword("Ab1!"),
    (err) => {
      assert.equal(err.constructor.name, "ValidationError");
      assert.match(err.message, /at least 8 characters/);
      return true;
    }
  );
});

test("validatePassword: throws on password with only letters (no number or special)", () => {
  assert.throws(
    () => validatePassword("abcdefgh"),
    (err) => {
      assert.equal(err.constructor.name, "ValidationError");
      assert.match(err.message, /number or special character/);
      return true;
    }
  );
});

test("validatePassword: throws on exactly 7 chars even with number", () => {
  assert.throws(
    () => validatePassword("Abc123!"),
    (err) => {
      assert.equal(err.constructor.name, "ValidationError");
      return true;
    }
  );
});

test("validatePassword: passes for password with number (Test1234)", () => {
  assert.doesNotThrow(() => validatePassword("Test1234"));
});

test("validatePassword: passes for password with special char (Test@123)", () => {
  assert.doesNotThrow(() => validatePassword("Test@123"));
});

test("validatePassword: passes for password with special char only (no number)", () => {
  assert.doesNotThrow(() => validatePassword("abcdefg!"));
});

test("validatePassword: passes for password with underscore", () => {
  assert.doesNotThrow(() => validatePassword("password_long"));
});

test("validatePassword: passes minimum valid — 8 chars with one number", () => {
  assert.doesNotThrow(() => validatePassword("aaaaaaaa1"));
});
