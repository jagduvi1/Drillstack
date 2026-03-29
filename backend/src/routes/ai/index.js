const router = require("express").Router();
const { aiLimiter } = require("../../utils/rateLimiters");

// ── Shared rate limiter ─────────────────────────────────────────────────────
router.use(aiLimiter);

// ── Mount sub-routers ───────────────────────────────────────────────────────
router.use("/", require("./drills"));
router.use("/", require("./sessions"));
router.use("/", require("./programs"));
router.use("/", require("./tactics"));

// Re-export shared utilities for external consumers (if any)
const { isDev, sanitizeDebug, sanitizeAiInput, escapeRegex } = require("./utils");
module.exports = router;
module.exports.isDev = isDev;
module.exports.sanitizeDebug = sanitizeDebug;
module.exports.sanitizeAiInput = sanitizeAiInput;
module.exports.escapeRegex = escapeRegex;
