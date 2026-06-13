// tests/access.test.js
// Unit tests for the authorize middleware (no DB required).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const authorize = require("../middleware/authorize");

// Helper: build a mock req with the given permissions array
function makeReq(permissions) {
  return { user: { role: "test_role", permissions } };
}

// Helper: invoke the middleware and return the value passed to next()
function run(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

// ── authorize("A", "B") passes when user has permission "A" ──────────────────
test('authorize passes when user has the first listed permission', async () => {
  const mw = authorize("reports:read:all", "reports:read:own");
  const err = await run(mw, makeReq(["reports:read:all"]));
  assert.equal(err, undefined, "next() should be called with no error");
});

// ── authorize("A", "B") passes when user has permission "B" ──────────────────
test('authorize passes when user has a non-first listed permission', async () => {
  const mw = authorize("reports:read:all", "reports:read:own");
  const err = await run(mw, makeReq(["reports:read:own"]));
  assert.equal(err, undefined, "next() should be called with no error");
});

// ── authorize("A", "B") fails with ForbiddenError when user has neither ──────
test('authorize fails with ForbiddenError when user has none of the required permissions', async () => {
  const mw = authorize("reports:read:all", "reports:read:own");
  const err = await run(mw, makeReq(["some:other:permission"]));
  assert.ok(err, "next() should be called with an error");
  assert.equal(err.constructor.name, "ForbiddenError");
  assert.equal(err.statusCode, 403);
});

// ── authorize fails when user has no permissions at all ───────────────────────
test('authorize fails with ForbiddenError when user has an empty permissions array', async () => {
  const mw = authorize("finance:dashboard", "reports:read:all");
  const err = await run(mw, makeReq([]));
  assert.ok(err, "next() should be called with an error");
  assert.equal(err.constructor.name, "ForbiddenError");
  assert.equal(err.statusCode, 403);
});

// ── authorize fails when req.user is missing ──────────────────────────────────
test('authorize fails with ForbiddenError when req.user is undefined', async () => {
  const mw = authorize("reports:read:all");
  const req = {}; // no .user
  const err = await run(mw, req);
  assert.ok(err, "next() should be called with an error");
  assert.equal(err.constructor.name, "ForbiddenError");
  assert.match(err.message, /User context missing/);
});
