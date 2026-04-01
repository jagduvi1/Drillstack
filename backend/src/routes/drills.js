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
const Group = require("../models/Group");
const Notification = require("../models/Notification");
const { indexDrill, removeDrill, getQueueStatus, checkEmbeddingSimilarity, findSimilarDrills } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");
const { createDrillSnapshot } = require("../utils/drillSnapshot");
const { escapeRegex } = require("./ai/utils");
const { standardLimiter } = require("../utils/rateLimiters");
const { logAudit } = require("../models/AuditLog");

router.use(standardLimiter);

// ── Helper: merge personal + team + club starred drills ─────────────────────
async function getEffectiveStarredSet(userId) {
  const [user, userGroups] = await Promise.all([
    User.findById(userId).select("starredDrills unstarredDrills"),
    Group.find({ "members.user": userId }).select("starredDrills parentClub").lean(),
  ]);

  const allIds = new Set((user?.starredDrills || []).map((id) => id.toString()));
  const unstarred = new Set((user?.unstarredDrills || []).map((id) => id.toString()));

  const parentClubIds = [];
  for (const g of userGroups) {
    for (const id of g.starredDrills || []) allIds.add(id.toString());
    if (g.parentClub) parentClubIds.push(g.parentClub);
  }

  if (parentClubIds.length > 0) {
    const clubs = await Group.find({ _id: { $in: parentClubIds } }).select("starredDrills").lean();
    for (const c of clubs) {
      for (const id of c.starredDrills || []) allIds.add(id.toString());
    }
  }

  // Remove user's personal unstarred overrides
  for (const id of unstarred) allIds.delete(id);

  return allIds;
}

// GET /api/drills — public: returns ALL drills (no createdBy filter)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.intensity) filter.intensity = String(req.query.intensity);
    if (req.query.apparatus) filter.apparatus = String(req.query.apparatus);
    if (req.query.skillLevel) filter.skillLevel = String(req.query.skillLevel);
    if (req.query.search) {
      const escaped = escapeRegex(String(req.query.search).slice(0, 200));
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }
    // Only show "root" drills by default (not forks), unless ?versions=all
    if (req.query.versions !== "all") filter.parentDrill = null;
    // Build effective starred set (personal + team + club, minus unstarred)
    const starredSet = await getEffectiveStarredSet(req.user._id);

    // Filter by starred
    if (req.query.starred === "true") {
      filter._id = { $in: [...starredSet] };
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

    // Swap in preferred versions
    const user = await User.findById(req.user._id).select("defaultVersions");
    const defaultVersions = user?.defaultVersions || new Map();

    // For each parent drill, check if the user has a preferred version
    const swapIds = [];
    for (const d of drills) {
      const prefId = defaultVersions.get(d._id.toString());
      if (prefId && prefId.toString() !== d._id.toString()) {
        swapIds.push(prefId);
      }
    }
    const swapDrills = swapIds.length > 0
      ? await Drill.find({ _id: { $in: swapIds } }).populate("createdBy", "name")
      : [];
    const swapMap = new Map(swapDrills.map((d) => [d._id.toString(), d]));

    const enriched = drills.map((d) => {
      const prefId = defaultVersions.get(d._id.toString());
      const preferred = prefId ? swapMap.get(prefId.toString()) : null;
      const obj = preferred ? preferred.toObject() : d.toObject();
      obj.isStarred = starredSet.has(obj._id.toString());
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

    const starredSet = await getEffectiveStarredSet(req.user._id);
    const obj = drill.toObject();
    obj.isStarred = starredSet.has(drill._id.toString());
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
      const { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation, apparatus, skillLevel, prerequisites, safetyNotes, progressionParent } = req.body;
      const drill = await Drill.create({ title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation, apparatus, skillLevel, prerequisites, safetyNotes, progressionParent: progressionParent || null, createdBy: req.user._id });
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
      apparatus: original.apparatus,
      skillLevel: original.skillLevel,
      prerequisites: [...(original.prerequisites || [])],
      safetyNotes: original.safetyNotes,
      progressionParent: original.progressionParent,
      parentDrill: rootId,
      version: versionCount + 1,
      forkedBy: req.user._id,
      createdBy: req.user._id,
      aiConversation: [],
    });

    indexDrill(fork).catch((e) => console.error("Index error:", e.message));
    logAudit("drill.fork", { userId: req.user._id, ip: req.ip, targetType: "drill", targetId: fork._id, details: { originalId: req.params.id } });
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
    const { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation, apparatus, skillLevel, prerequisites, safetyNotes, progressionParent } = req.body;
    const drill = await Drill.findByIdAndUpdate(
      req.params.id,
      { $set: { title, description, sport, intensity, setup, howItWorks, coachingPoints, variations, commonMistakes, diagrams, versionName, aiConversation, apparatus, skillLevel, prerequisites, safetyNotes, progressionParent: progressionParent || null } },
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

    // Exclude all drills in the same version family
    const rootId = drill.parentDrill || drill._id;
    const familyDrills = await Drill.find({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    }).select("_id");
    const excludeIds = new Set(familyDrills.map((d) => d._id.toString()));

    const similar = await findSimilarDrills(drill, excludeIds);
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
      const drill = req.resource;

      // Check if any other users have starred this drill
      const starredByOthers = await User.countDocuments({
        starredDrills: drill._id,
        _id: { $ne: req.user._id },
      });
      // Also check group stars
      const groupStars = await Group.countDocuments({ starredDrills: drill._id });

      if (starredByOthers > 0 || groupStars > 0) {
        // Mark as pending deletion instead of deleting
        drill.pendingDeletion = true;
        drill.deletionRequestedAt = new Date();
        drill.deletionRequestedBy = req.user._id;
        await drill.save();

        // Notify all users who starred this drill
        const usersWithStar = await User.find(
          { starredDrills: drill._id, _id: { $ne: req.user._id } }
        ).select("_id");
        const notifications = usersWithStar.map((u) => ({
          userId: u._id,
          type: "drill_pending_deletion",
          drillId: drill._id,
          message: `"${drill.title}" is being deleted by its owner. Claim it within 30 days to keep it.`,
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        logAudit("drill.delete.pending", { userId: req.user._id, ip: req.ip, targetType: "drill", targetId: drill._id, details: { title: drill.title } });
        return res.json({ message: "Deletion pending", pendingDeletion: true });
      }

      // No one else has starred — delete immediately
      const TacticBoard = require("../models/TacticBoard");
      await TacticBoard.deleteMany({ drill: drill._id });
      await Drill.findByIdAndDelete(drill._id);
      removeDrill(drill._id).catch((e) => console.error("Remove index error:", e.message));
      logAudit("drill.delete", { userId: req.user._id, ip: req.ip, targetType: "drill", targetId: drill._id, details: { title: drill.title } });
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/drills/:id/claim — claim a drill pending deletion
router.post("/:id/claim", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    if (!drill.pendingDeletion) {
      return res.status(400).json({ error: "Drill is not pending deletion" });
    }
    if (drill.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You are the current owner" });
    }

    // Transfer ownership
    drill.createdBy = req.user._id;
    drill.pendingDeletion = false;
    drill.deletionRequestedAt = null;
    drill.deletionRequestedBy = null;
    await drill.save();

    // Transfer linked tactic boards
    const TacticBoard = require("../models/TacticBoard");
    await TacticBoard.updateMany(
      { drill: drill._id },
      { $set: { createdBy: req.user._id } }
    );

    // Clean up pending deletion notifications for this drill
    await Notification.deleteMany({
      drillId: drill._id,
      type: "drill_pending_deletion",
    });

    logAudit("drill.claim", { userId: req.user._id, ip: req.ip, targetType: "drill", targetId: drill._id, details: { title: drill.title } });
    res.json(drill);
  } catch (err) {
    next(err);
  }
});

// POST /api/drills/:id/star — toggle star (also sets as default version)
router.post("/:id/star", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id).select("parentDrill");
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const user = await User.findById(req.user._id);
    const drillId = req.params.id;
    const idx = user.starredDrills.findIndex(
      (id) => id.toString() === drillId
    );

    if (idx === -1) {
      // Starring: add to personal stars, remove from unstarred overrides
      user.starredDrills.push(drillId);
      user.unstarredDrills = (user.unstarredDrills || []).filter(
        (id) => id.toString() !== drillId
      );
      // Auto-set this version as the user's default for the drill family
      const rootId = (drill.parentDrill || drill._id).toString();
      user.defaultVersions.set(rootId, drillId);
    } else {
      // Unstarring: remove from personal stars, add to unstarred overrides
      // (so inherited group stars don't re-show this drill)
      user.starredDrills.splice(idx, 1);
      if (!(user.unstarredDrills || []).some((id) => id.toString() === drillId)) {
        user.unstarredDrills.push(drillId);
      }
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

// GET /api/drills/:id/progressions — get drills in a skill progression chain
router.get("/:id/progressions", authenticate, async (req, res, next) => {
  try {
    const drill = await Drill.findById(req.params.id).select("title");
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    // Find drills that have this drill as their progressionParent
    const next = await Drill.find({ progressionParent: drill._id })
      .select("title sport apparatus skillLevel")
      .sort({ skillLevel: 1 });
    res.json(next);
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
  require("../middleware/upload").stripExif,
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
