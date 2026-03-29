const isDev = process.env.NODE_ENV !== "production";

/** Strip debug info from AI responses in production */
function sanitizeDebug(debug) {
  if (!debug || isDev) return debug;
  return {
    provider: debug.provider,
    model: debug.model,
    durationMs: debug.durationMs,
  };
}

/** Sanitize user message before injecting into AI prompt context */
function sanitizeAiInput(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .slice(0, 5000);
}

/** Escape regex special characters in a string for safe use in $regex */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { isDev, sanitizeDebug, sanitizeAiInput, escapeRegex };
