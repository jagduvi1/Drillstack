const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Drill = require("../models/Drill");
const { indexDrill, removeDrill, getQueueStatus } = require("../services/sync");

// GET /api/drills
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.intensity) filter.intensity = req.query.intensity;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [drills, total] = await Promise.all([
      Drill.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Drill.countDocuments(filter),
    ]);
    res.json({ drills, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/drills/embedding-status — global embedding queue status
router.get("/embedding-status", authenticate, (req, res) => {
  res.json(getQueueStatus());
});

// GET /api/drills/:id
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id)
      .populate("createdBy", "name");
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// POST /api/drills
router.post(
  "/",
  authenticate,
  [body("title").trim().notEmpty(), body("description").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const drill = await Drill.create({ ...req.body, createdBy: req.user._id });
      indexDrill(drill).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/drills/:id
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    indexDrill(drill).catch((e) => console.error("Index error:", e.message));
    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/drills/:id
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    removeDrill(drill._id).catch((e) => console.error("Remove index error:", e.message));
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/retry-embedding — retry a failed embedding
router.post("/:id/retry-embedding", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    indexDrill(drill).catch((e) => console.error("Retry index error:", e.message));
    res.json({ message: "Re-queued for embedding", embeddingStatus: "pending" });
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/diagrams
router.post(
  "/:id/diagrams",
  authenticate,
  upload.single("diagram"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const drill = await Drill.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        { $push: { diagrams: `/uploads/${req.file.filename}` } },
        { new: true }
      );
      if (!drill) return res.status(404).json({ error: "Drill not found" });
      res.json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/drills/:id/reflections
router.post(
  "/:id/reflections",
  authenticate,
  [body("note").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const drill = await Drill.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        { $push: { reflectionNotes: { note: req.body.note } } },
        { new: true }
      );
      if (!drill) return res.status(404).json({ error: "Drill not found" });
      res.json(drill);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
