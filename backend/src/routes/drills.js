const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { checkOwnership } = require("../middleware/checkOwnership");
const { parsePagination } = require("../middleware/pagination");
const Drill = require("../models/Drill");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { indexDrill, removeDrill, getQueueStatus, checkEmbeddingSimilarity, findSimilarDrills } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");
const { createDrillSnapshot } = require("../utils/drillSnapshot");

const drillsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
router.use(drillsLimiter);

// GET /api/drills — public: returns ALL drills (no createdBy filter)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.intensity) filter.intensity = String(req.query.intensity);
    // Only show "root" drills by default (not forks), unless ?versions=all
    if (req.query.versions !== "all") filter.parentDrill = null;
    // Filter by starred
    if (req.query.starred === "true") {
      const u = await User.findById(req.user._id).select("starredDrills");
      filter._id = { $in: u?.starredDrills || [] };
    }

    const { page, limit, skip } = parsePagination(req.query);

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

    // If starredFirst=true, sort starred drills to the top
    if (req.query.starredFirst === "true") {
      enriched.sort((a, b) => (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0));
    }

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
  checkLimit("drills"),
  [body("title").trim().notEmpty().isLength({ max: 200 }), body("description").trim().notEmpty().isLength({ max: 5000 })],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation } = req.body;
      const drill = await Drill.create({ title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation, createdBy: req.user._id });
      indexDrill(drill).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/drills/:id/fork — create a personal version of a drill
const forkLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.post("/:id/fork", authenticate, forkLimiter, async (req, res, next) => {
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
    // Load current drill BEFORE applying changes (for snapshot)
    const before = await Drill.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!before) return res.status(404).json({ error: "Drill not found or not yours to edit" });

    // Find all users who starred this drill (excluding the owner)
    const starredUsers = await User.find({
      starredDrills: before._id,
      _id: { $ne: req.user._id },
    }).select("_id");

    // If others have starred it, create notifications with a snapshot of the old version
    if (starredUsers.length > 0) {
      const snapshot = createDrillSnapshot(before);

      const notifications = starredUsers.map((u) => ({
        userId: u._id,
        type: "drill_changed",
        drillId: before._id,
        message: `"${before.title}" was updated by its owner. You can create your own version from the previous state.`,
        snapshot,
      }));

      Notification.insertMany(notifications).catch((e) =>
        console.error("Notification insert error:", e.message)
      );
    }

    // Now apply the update — explicitly pick allowed fields to prevent operator injection
    const { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation } = req.body;
    const drill = await Drill.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation } },
      { new: true, runValidators: true }
    );
    indexDrill(drill).catch((e) => console.error("Index error:", e.message));
    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/check-similarity — embedding-based check if edits differ too much
router.post("/:id/check-similarity", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const parentId = drill.parentDrill || drill._id;
    const result = await checkEmbeddingSimilarity(parentId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/find-similar — find existing drills similar to this one
router.post("/:id/find-similar", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const similar = await findSimilarDrills(drill, drill._id.toString());
    res.json({ similar });
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/convert-to-version — convert a standalone drill into a version of another
router.post("/:id/convert-to-version", authenticate, async (req, res, next) => {
  try {
    const { parentDrillId } = req.body;
    if (!parentDrillId) return res.status(400).json({ error: "parentDrillId required" });

    const drill = await Drill.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!drill) return res.status(404).json({ error: "Drill not found or not yours" });

    const parent = await Drill.findOne({ _id: String(parentDrillId) });
    if (!parent) return res.status(404).json({ error: "Parent drill not found" });

    const rootId = parent.parentDrill || parent._id;
    const versionCount = await Drill.countDocuments({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    });

    drill.parentDrill = rootId;
    drill.version = versionCount + 1;
    drill.forkedBy = req.user._id;
    await drill.save();

    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/drills/:id — only owner or admin
router.delete(
  "/:id",
  authenticate,
  checkOwnership(Drill, { resourceName: "Drill", allowAdmin: true, allowGroupTrainer: false }),
  async (req, res, next) => {
    try {
      await Drill.findByIdAndDelete(req.params.id);
      removeDrill(req.resource._id).catch((e) => console.error("Remove index error:", e.message));
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

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
const MAX_DIAGRAMS = 10;
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.post(
  "/:id/diagrams",
  authenticate,
  uploadLimiter,
  upload.single("diagram"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const existing = await Drill.findOne({ _id: req.params.id, createdBy: req.user._id }).select("diagrams");
      if (!existing) return res.status(404).json({ error: "Drill not found" });
      if ((existing.diagrams?.length || 0) >= MAX_DIAGRAMS) {
        return res.status(400).json({ error: `Maximum ${MAX_DIAGRAMS} diagrams per drill` });
      }
      const drill = await Drill.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        { $push: { diagrams: `/uploads/${req.file.filename}` } },
        { new: true }
      );
      res.json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/drills/:id/reflections — any user can add reflections
const reflectionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.post(
  "/:id/reflections",
  authenticate,
  reflectionLimiter,
  [body("note").trim().notEmpty().isLength({ max: 2000 })],
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
