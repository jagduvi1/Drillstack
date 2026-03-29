const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../middleware/auth");
const { semanticSearch, keywordSearch, hybridSearch } = require("../services/search");

const searchLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
router.use(searchLimiter);

function parseSearchLimit(val) {
  return Math.max(1, Math.min(100, parseInt(val, 10) || 20));
}

// GET /api/search/semantic?q=&sport=&type=&limit=
router.get("/semantic", authenticate, async (req, res, next) => {
  try {
    const { q, sport, type } = req.query;
    if (!q || typeof q !== "string") return res.status(400).json({ error: "Query parameter 'q' is required" });
    const validTypes = ["drill", "session", "plan"];
    const results = await semanticSearch(q.slice(0, 500), {
      sport: sport ? String(sport).slice(0, 100) : null,
      type: type && validTypes.includes(type) ? type : null,
      limit: parseSearchLimit(req.query.limit),
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/keyword?q=&index=&sport=&limit=
router.get("/keyword", authenticate, async (req, res, next) => {
  try {
    const { q, index, sport } = req.query;
    if (!q || typeof q !== "string") return res.status(400).json({ error: "Query parameter 'q' is required" });
    const validIndexes = ["drills", "sessions", "plans"];
    const results = await keywordSearch(q.slice(0, 500), {
      index: index && validIndexes.includes(index) ? index : "drills",
      sport: sport ? String(sport).slice(0, 100) : null,
      limit: parseSearchLimit(req.query.limit),
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/hybrid?q=&sport=&limit=
router.get("/hybrid", authenticate, async (req, res, next) => {
  try {
    const { q, sport } = req.query;
    if (!q || typeof q !== "string") return res.status(400).json({ error: "Query parameter 'q' is required" });
    const results = await hybridSearch(q.slice(0, 500), {
      sport: sport ? String(sport).slice(0, 100) : null,
      limit: parseSearchLimit(req.query.limit),
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
