const rateLimit = require("express-rate-limit");

function createLimiter(windowMs, max, opts = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  });
}

module.exports = {
  createLimiter,
  // Standard route limiters
  standardLimiter: createLimiter(15 * 60 * 1000, 200),
  // Auth limiters
  loginLimiter: createLimiter(15 * 60 * 1000, 8, { skipSuccessfulRequests: true, message: { error: "Too many login attempts, please try again later" } }),
  registerLimiter: createLimiter(60 * 60 * 1000, 5, { message: { error: "Too many registration attempts, please try again later" } }),
  refreshLimiter: createLimiter(15 * 60 * 1000, 30),
  // Feature limiters
  searchLimiter: createLimiter(15 * 60 * 1000, 100),
  aiLimiter: createLimiter(15 * 60 * 1000, 100),
  superadminLimiter: createLimiter(15 * 60 * 1000, 100),
};
