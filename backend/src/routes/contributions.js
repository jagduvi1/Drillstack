const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const upload = require("../middleware/upload");
const { standardLimiter, createLimiter } = require("../utils/rateLimiters");
const DrillContribution = require("../models/DrillContribution");
const Drill = require("../models/Drill");
const TacticBoard = require("../models/TacticBoard");
const { logAudit } = require("../models/AuditLog");

const uploadLimiter = createLimiter(60 * 60 * 1000, 30);

router.use(standardLimiter);
router.use(authenticate);
router.use(resolveUserGroups);

// GET /api/contributions/:drillId — list contributions visible to this user
router.get("/:drillId", async (req, res, next) => {
  try {
    const drillId = String(req.params.drillId);
    const drillExists = await Drill.exists({ _id: drillId });
    if (!drillExists) return res.status(404).json({ error: "Drill not found" });

    // Build visibility filter: public + own private + group memberships
    const visFilter = [
      { visibility: "public" },
      { visibility: "private", createdBy: req.user._id },
    ];
    if (req.userGroupIds && req.userGroupIds.length > 0) {
      visFilter.push({ visibility: "group", group: { $in: req.userGroupIds } });
    }

    const contributions = await DrillContribution.find({
      drill: drillId,
      $or: visFilter,
    })
      .populate("createdBy", "name")
      .populate("group", "name type")
      .populate("tactic", "title sport fieldType homeTeam awayTeam")
      .sort({ createdAt: -1 });

    res.json(contributions);
  } catch (err) {
    next(err);
  }
});

// POST /api/contributions/:drillId/video — add a video
router.post(
  "/:drillId/video",
  [
    body("url").trim().notEmpty().isURL(),
    body("title").optional().trim().isLength({ max: 200 }),
    body("visibility").optional().isIn(["public", "private", "group"]),
    body("group").optional().isMongoId(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const drillId = String(req.params.drillId);
      const drillExists = await Drill.exists({ _id: drillId });
      if (!drillExists) return res.status(404).json({ error: "Drill not found" });

      const visibility = req.body.visibility || "public";
      if (visibility === "group" && !req.body.group) {
        return res.status(400).json({ error: "Group ID required for group visibility" });
      }
      if (visibility === "group") {
        const groupId = String(req.body.group);
        if (!req.userGroupIds?.some((id) => id.toString() === groupId)) {
          return res.status(403).json({ error: "You are not a member of that group" });
        }
      }

      const contribution = await DrillContribution.create({
        drill: drillId,
        type: "video",
        url: req.body.url,
        title: req.body.title || "",
        visibility,
        group: visibility === "group" ? String(req.body.group) : null,
        createdBy: req.user._id,
      });

      await logAudit("contribution.create", {
        userId: req.user._id,
        ip: req.ip,
        targetType: "contribution",
        targetId: contribution._id,
        details: { drillId, type: "video", visibility },
      });

      await contribution.populate("createdBy", "name");
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/contributions/:drillId/drawing — upload a drawing
router.post(
  "/:drillId/drawing",
  uploadLimiter,
  upload.single("drawing"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const drillId = String(req.params.drillId);
      const drillExists = await Drill.exists({ _id: drillId });
      if (!drillExists) return res.status(404).json({ error: "Drill not found" });

      const visibility = req.body.visibility || "public";
      if (visibility === "group" && !req.body.group) {
        return res.status(400).json({ error: "Group ID required for group visibility" });
      }
      if (visibility === "group") {
        const groupId = String(req.body.group);
        if (!req.userGroupIds?.some((id) => id.toString() === groupId)) {
          return res.status(403).json({ error: "You are not a member of that group" });
        }
      }

      const contribution = await DrillContribution.create({
        drill: drillId,
        type: "drawing",
        filePath: `/uploads/${req.file.filename}`,
        title: req.body.title || "",
        visibility,
        group: visibility === "group" ? String(req.body.group) : null,
        createdBy: req.user._id,
      });

      await logAudit("contribution.create", {
        userId: req.user._id,
        ip: req.ip,
        targetType: "contribution",
        targetId: contribution._id,
        details: { drillId, type: "drawing", visibility },
      });

      await contribution.populate("createdBy", "name");
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/contributions/:drillId/tactic — link a tactic board
router.post(
  "/:drillId/tactic",
  [
    body("tacticId").isMongoId(),
    body("title").optional().trim().isLength({ max: 200 }),
    body("visibility").optional().isIn(["public", "private", "group"]),
    body("group").optional().isMongoId(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const drillId = String(req.params.drillId);
      const drillExists = await Drill.exists({ _id: drillId });
      if (!drillExists) return res.status(404).json({ error: "Drill not found" });

      const tacticId = String(req.body.tacticId);
      const tactic = await TacticBoard.findById(tacticId);
      if (!tactic) return res.status(404).json({ error: "Tactic board not found" });

      const visibility = req.body.visibility || "public";
      if (visibility === "group" && !req.body.group) {
        return res.status(400).json({ error: "Group ID required for group visibility" });
      }
      if (visibility === "group") {
        const groupId = String(req.body.group);
        if (!req.userGroupIds?.some((id) => id.toString() === groupId)) {
          return res.status(403).json({ error: "You are not a member of that group" });
        }
      }

      const contribution = await DrillContribution.create({
        drill: drillId,
        type: "tactic",
        tactic: tacticId,
        title: req.body.title || tactic.title || "",
        visibility,
        group: visibility === "group" ? String(req.body.group) : null,
        createdBy: req.user._id,
      });

      await logAudit("contribution.create", {
        userId: req.user._id,
        ip: req.ip,
        targetType: "contribution",
        targetId: contribution._id,
        details: { drillId, type: "tactic", tacticId, visibility },
      });

      await contribution.populate("createdBy", "name");
      await contribution.populate("tactic", "title sport fieldType homeTeam awayTeam");
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/contributions/:id — delete own contribution
router.delete("/:id", async (req, res, next) => {
  try {
    const contribution = await DrillContribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ error: "Not found" });
    if (contribution.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await contribution.deleteOne();

    await logAudit("contribution.delete", {
      userId: req.user._id,
      ip: req.ip,
      targetType: "contribution",
      targetId: contribution._id,
      details: { drillId: contribution.drill, type: contribution.type },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
