const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { semanticSearch, keywordSearch, hybridSearch } = require("../services/search");

// GET /api/search/semantic?q=&sport=&type=&limit=
router.get("/semantic", authenticate, async (req, res, next) => {
  try {
    const { q, sport, type, limit } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
    const results = await semanticSearch(q, {
      sport: sport || null,
      type: type || null,
      limit: parseInt(limit, 10) || 20,
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/keyword?q=&index=&sport=&limit=
router.get("/keyword", authenticate, async (req, res, next) => {
  try {
    const { q, index, sport, limit } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
    const results = await keywordSearch(q, {
      index: index || "drills",
      sport: sport || null,
      limit: parseInt(limit, 10) || 20,
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/hybrid?q=&sport=&limit=
router.get("/hybrid", authenticate, async (req, res, next) => {
  try {
    const { q, sport, limit } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
    const results = await hybridSearch(q, {
      sport: sport || null,
      limit: parseInt(limit, 10) || 20,
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
