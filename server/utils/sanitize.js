// utils/sanitize.js
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegex(str) {
  if (str == null) return "";
  return String(str).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns `requested` only if it is in the `allowed` list, else `defaultSort`.
function sanitizeSort(requested, allowed, defaultSort) {
  return allowed.includes(requested) ? requested : defaultSort;
}

// Returns true if `value` is a valid http/https URL, or is empty/absent (optional fields).
// Rejects javascript:, data:, file:, and other unsafe schemes.
function isValidUrl(value) {
  if (!value || value === "") return true;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

// Collapses repeated query params (?foo=a&foo=b → "a") so arrays never reach DB filters.
// Express parses duplicated query keys as arrays; passing an array to a Mongoose query
// uses implicit $in, which can expose more data than intended.
function qs(value) {
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value;
}

// Returns safe { page, limit, skip } from raw query-string values.
// Guards against page=0, page=-1, limit=-5, limit=abc, etc.
function parsePagination(rawPage, rawLimit, defaultLimit = 20, maxLimit = 200) {
  const page  = Math.max(1, parseInt(rawPage)  || 1);
  const limit = Math.min(Math.max(1, parseInt(rawLimit) || defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { escapeHtml, escapeRegex, sanitizeSort, isValidUrl, qs, parsePagination };
