const { test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../utils/sanitize");

test("escapeHtml: escapes angle brackets", () => {
  assert.equal(escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapeHtml: escapes ampersand", () => {
  assert.equal(escapeHtml("a & b"), "a &amp; b");
});

test("escapeHtml: escapes double quotes", () => {
  assert.equal(escapeHtml(`say "hello"`), "say &quot;hello&quot;");
});

test("escapeHtml: escapes single quotes", () => {
  assert.equal(escapeHtml("it's"), "it&#039;s");
});

test("escapeHtml: passes through safe strings unchanged", () => {
  assert.equal(escapeHtml("Hello ZRC Media"), "Hello ZRC Media");
});

test("escapeHtml: handles null/undefined gracefully", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});
