const { test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml, escapeRegex } = require("../utils/sanitize");

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

test("escapeRegex: escapes ReDoS pattern characters", () => {
  assert.equal(escapeRegex("(a+)+$"), "\\(a\\+\\)\\+\\$");
});

test("escapeRegex: escapes dot and star", () => {
  assert.equal(escapeRegex("file.txt*"), "file\\.txt\\*");
});

test("escapeRegex: safe strings pass through unchanged", () => {
  assert.equal(escapeRegex("hello world"), "hello world");
});

test("escapeRegex: handles null/undefined gracefully", () => {
  assert.equal(escapeRegex(null), "");
  assert.equal(escapeRegex(undefined), "");
});

const { sanitizeSort } = require("../utils/sanitize");
const ALLOWED = ["-createdAt", "createdAt", "name", "-name"];

test("sanitizeSort: returns requested value when in allowlist", () => {
  assert.equal(sanitizeSort("name", ALLOWED, "-createdAt"), "name");
});

test("sanitizeSort: returns default when requested value is not allowed", () => {
  assert.equal(sanitizeSort("__proto__", ALLOWED, "-createdAt"), "-createdAt");
});

test("sanitizeSort: returns default when requested is undefined", () => {
  assert.equal(sanitizeSort(undefined, ALLOWED, "-createdAt"), "-createdAt");
});

test("sanitizeSort: returns default when requested is empty string", () => {
  assert.equal(sanitizeSort("", ALLOWED, "-createdAt"), "-createdAt");
});

const { isValidUrl, qs } = require("../utils/sanitize");

test("qs: returns scalar value unchanged", () => {
  assert.equal(qs("admin"), "admin");
});

test("qs: collapses array to first element", () => {
  assert.equal(qs(["admin", "super_admin"]), "admin");
});

test("qs: returns undefined for empty array", () => {
  assert.equal(qs([]), undefined);
});

test("qs: returns undefined for undefined", () => {
  assert.equal(qs(undefined), undefined);
});

test("isValidUrl: accepts valid https URL", () => {
  assert.ok(isValidUrl("https://example.com"));
});

test("isValidUrl: accepts valid http URL", () => {
  assert.ok(isValidUrl("http://example.com/path?q=1"));
});

test("isValidUrl: rejects javascript: URI", () => {
  assert.equal(isValidUrl("javascript:alert(1)"), false);
});

test("isValidUrl: rejects data: URI", () => {
  assert.equal(isValidUrl("data:text/html,<script>alert(1)</script>"), false);
});

test("isValidUrl: rejects plain string", () => {
  assert.equal(isValidUrl("not-a-url"), false);
});

test("isValidUrl: accepts empty string (optional field)", () => {
  assert.ok(isValidUrl(""));
});

test("isValidUrl: accepts null/undefined (optional field)", () => {
  assert.ok(isValidUrl(null));
  assert.ok(isValidUrl(undefined));
});
