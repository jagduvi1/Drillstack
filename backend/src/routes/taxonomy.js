const router = require("express").Router();
const { body, param, query } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const Taxonomy = require("../models/Taxonomy");

// GET /api/taxonomy?category=&sport=
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.sport) {
      filter.$or = [{ sport: req.query.sport }, { sport: null }];
    }
    const items = await Taxonomy.find(filter)
      .populate("parent", "name category")
      .sort({ category: 1, sortOrder: 1, name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/taxonomy/categories — list distinct categories
router.get("/categories", authenticate, async (_req, res, next) => {
  try {
    const categories = await Taxonomy.distinct("category");
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/taxonomy
router.post(
  "/",
  authenticate,
  [body("category").trim().notEmpty(), body("name").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const item = await Taxonomy.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/taxonomy/:id
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const item = await Taxonomy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/taxonomy/:id
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const item = await Taxonomy.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
