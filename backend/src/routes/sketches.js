const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const { standardLimiter } = require("../utils/rateLimiters");
const Sketch = require("../models/Sketch");

router.use(standardLimiter);
router.use(authenticate);

// GET /api/sketches — list user's sketches
router.get("/", resolveUserGroups, async (req, res, next) => {
  try {
    const conditions = [{ createdBy: req.user._id }];
    if (req.userTrainerGroupIds?.length > 0) {
      conditions.push({ group: { $in: req.userTrainerGroupIds }, visibility: "group" });
    }
    const sketches = await Sketch.find({ $or: conditions })
      .sort({ updatedAt: -1 })
      .populate("drill", "title")
      .populate("createdBy", "name");
    res.json(sketches);
  } catch (err) {
    next(err);
  }
});

// GET /api/sketches/:id
router.get("/:id", async (req, res, next) => {
  try {
    const sketch = await Sketch.findById(req.params.id)
      .populate("drill", "title")
      .populate("createdBy", "name");
    if (!sketch) return res.status(404).json({ error: "Sketch not found" });
    res.json(sketch);
  } catch (err) {
    next(err);
  }
});

// POST /api/sketches
router.post("/", async (req, res, next) => {
  try {
    const sketch = await Sketch.create({
      title: req.body.title || "",
      sport: req.body.sport || "",
      pieces: req.body.pieces || [],
      arrows: req.body.arrows || [],
      drill: req.body.drill || null,
      group: req.body.group || null,
      visibility: req.body.visibility || "private",
      createdBy: req.user._id,
    });
    res.status(201).json(sketch);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sketches/:id
router.put("/:id", async (req, res, next) => {
  try {
    const sketch = await Sketch.findById(req.params.id);
    if (!sketch) return res.status(404).json({ error: "Sketch not found" });
    if (sketch.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const allowed = ["title", "sport", "pieces", "arrows", "drill", "group", "visibility"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) sketch[key] = req.body[key];
    }
    await sketch.save();
    res.json(sketch);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sketches/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const sketch = await Sketch.findById(req.params.id);
    if (!sketch) return res.status(404).json({ error: "Sketch not found" });
    if (sketch.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await sketch.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
