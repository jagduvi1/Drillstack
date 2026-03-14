const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Drill = require("../models/Drill");
const User = require("../models/User");
const { indexDrill, removeDrill, getQueueStatus } = require("../services/sync");

// GET /api/drills — public: returns ALL drills (no createdBy filter)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.intensity) filter.intensity = req.query.intensity;
    // Only show "root" drills by default (not forks), unless ?versions=all
    if (req.query.versions !== "all") filter.parentDrill = null;
    // Filter by starred
    if (req.query.starred === "true") {
      const u = await User.findById(req.user._id).select("starredDrills");
      filter._id = { $in: u?.starredDrills || [] };
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [drills, total] = await Promise.all([
      Drill.find(filter)
        .populate("createdBy", "name")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Drill.countDocuments(filter),
    ]);

    // Attach starred status for the current user
    const user = await User.findById(req.user._id).select("starredDrills");
    const starredSet = new Set((user?.starredDrills || []).map((id) => id.toString()));
    const enriched = drills.map((d) => {
      const obj = d.toObject();
      obj.isStarred = starredSet.has(d._id.toString());
      return obj;
    });

    res.json({ drills: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/drills/embedding-status — global embedding queue status
router.get("/embedding-status", authenticate, (req, res) => {
  res.json(getQueueStatus());
});

// GET /api/drills/:id/versions — get all versions of a drill
router.get("/:id/versions", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const rootId = drill.parentDrill || drill._id;
    const versions = await Drill.find({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    })
      .populate("createdBy", "name")
      .populate("forkedBy", "name")
      .sort({ version: 1 });

    const user = await User.findById(req.user._id).select("defaultVersions");
    const defaultVersionId = user?.defaultVersions?.get(rootId.toString());

    res.json({
      versions,
      rootId: rootId.toString(),
      defaultVersionId: defaultVersionId?.toString() || rootId.toString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/drills/:id
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("forkedBy", "name")
      .populate("parentDrill", "title version");
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const rootId = drill.parentDrill?._id || drill._id;
    const versionCount = await Drill.countDocuments({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    });

    const user = await User.findById(req.user._id).select("starredDrills defaultVersions");
    const obj = drill.toObject();
    obj.isStarred = (user?.starredDrills || []).some(
      (id) => id.toString() === drill._id.toString()
    );
    obj.versionCount = versionCount;
    obj.isOwner = drill.createdBy._id.toString() === req.user._id.toString();

    res.json(obj);
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

// POST /api/drills/:id/fork — create a personal version of a drill
router.post("/:id/fork", authenticate, async (req, res, next) => {
  try {
    const original = await Drill.findById(req.params.id);
    if (!original) return res.status(404).json({ error: "Drill not found" });

    const rootId = original.parentDrill || original._id;
    const versionCount = await Drill.countDocuments({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    });

    const fork = await Drill.create({
      title: original.title,
      description: original.description,
      sport: original.sport,
      intensity: original.intensity,
      setup: original.setup,
      howItWorks: original.howItWorks,
      coachingPoints: [...original.coachingPoints],
      variations: [...original.variations],
      commonMistakes: [...original.commonMistakes],
      diagrams: [...original.diagrams],
      parentDrill: rootId,
      version: versionCount + 1,
      forkedBy: req.user._id,
      createdBy: req.user._id,
      aiConversation: [],
    });

    indexDrill(fork).catch((e) => console.error("Index error:", e.message));
    res.status(201).json(fork);
  } catch (err) {
    next(err);
  }
});

// PUT /api/drills/:id — only owner can edit in place
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!drill) return res.status(404).json({ error: "Drill not found or not yours to edit" });
    indexDrill(drill).catch((e) => console.error("Index error:", e.message));
    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/check-similarity — AI checks if edits differ too much from original
router.post("/:id/check-similarity", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const { checkSimilarity } = require("../services/ai");
    const result = await checkSimilarity(drill, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/drills/:id — only owner or admin
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const isOwner = drill.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only the creator or an admin can delete" });
    }

    await Drill.findByIdAndDelete(req.params.id);
    removeDrill(drill._id).catch((e) => console.error("Remove index error:", e.message));
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/star — toggle star
router.post("/:id/star", authenticate, async (req, res, next) => {
  try {
    const drillExists = await Drill.exists({ _id: req.params.id });
    if (!drillExists) return res.status(404).json({ error: "Drill not found" });

    const user = await User.findById(req.user._id);
    const idx = user.starredDrills.findIndex(
      (id) => id.toString() === req.params.id
    );

    if (idx === -1) {
      user.starredDrills.push(req.params.id);
    } else {
      user.starredDrills.splice(idx, 1);
    }
    await user.save();

    res.json({ starred: idx === -1 });
  } catch (err) {
    next(err);
  }
});

// PUT /api/drills/:id/default-version — set preferred version for a drill family
router.put("/:id/default-version", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const rootId = (drill.parentDrill || drill._id).toString();
    const user = await User.findById(req.user._id);
    user.defaultVersions.set(rootId, req.params.id);
    await user.save();

    res.json({ rootId, defaultVersionId: req.params.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/retry-embedding
router.post("/:id/retry-embedding", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
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

// POST /api/drills/:id/reflections — any user can add reflections
router.post(
  "/:id/reflections",
  authenticate,
  [body("note").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const drill = await Drill.findByIdAndUpdate(
        req.params.id,
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
