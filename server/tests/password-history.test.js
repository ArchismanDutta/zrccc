const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

// Unit-test the password history logic in isolation — no DB needed.
// We replicate the hook's check so it stays fast and dependency-free.

async function historyCheck(newPlaintext, historyHashes) {
  for (const hash of historyHashes) {
    if (await bcrypt.compare(newPlaintext, hash)) return true;
  }
  return false;
}

test("password history: rejects password matching the most recent entry", async () => {
  const oldHash = await bcrypt.hash("OldPass@1", 10);
  const reused = await historyCheck("OldPass@1", [oldHash]);
  assert.ok(reused, "should detect reuse of most recent password");
});

test("password history: rejects password matching an older entry", async () => {
  const hash1 = await bcrypt.hash("FirstPass@1", 10);
  const hash2 = await bcrypt.hash("SecondPass@2", 10);
  const hash3 = await bcrypt.hash("ThirdPass@3", 10);
  const reused = await historyCheck("FirstPass@1", [hash3, hash2, hash1]);
  assert.ok(reused, "should detect reuse of any historical password");
});

test("password history: allows a new password not in history", async () => {
  const hash1 = await bcrypt.hash("OldPass@1", 10);
  const hash2 = await bcrypt.hash("OldPass@2", 10);
  const reused = await historyCheck("BrandNew@3", [hash2, hash1]);
  assert.equal(reused, false, "should allow a genuinely new password");
});

test("password history: allows any password when history is empty", async () => {
  const reused = await historyCheck("AnyPass@1", []);
  assert.equal(reused, false, "empty history should never block");
});

test("password history: keeps only last 5 entries (slice logic)", () => {
  const existing = [
    { hash: "h1", changedAt: new Date() },
    { hash: "h2", changedAt: new Date() },
    { hash: "h3", changedAt: new Date() },
    { hash: "h4", changedAt: new Date() },
    { hash: "h5", changedAt: new Date() },
  ];
  const newEntry = { hash: "h-new", changedAt: new Date() };
  const updated = [newEntry, ...existing].slice(0, 5);
  assert.equal(updated.length, 5);
  assert.equal(updated[0].hash, "h-new");
  assert.equal(updated[4].hash, "h4", "oldest entry (h5) should be evicted");
});
