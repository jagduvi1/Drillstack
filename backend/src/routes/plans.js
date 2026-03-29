const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const { checkOwnership } = require("../middleware/checkOwnership");
const PeriodPlan = require("../models/PeriodPlan");
const { indexPlan } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");
const { standardLimiter } = require("../utils/rateLimiters");

router.use(standardLimiter);

// GET /api/plans
router.get("/", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const conditions = [{ createdBy: req.user._id }];

    // Plans shared with groups where user is admin or trainer
    if (req.userTrainerGroupIds && req.userTrainerGroupIds.length > 0) {
      conditions.push({
        group: { $in: req.userTrainerGroupIds },
        visibility: "group",
      });
    }

    const filter = { $or: conditions };
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.group) filter.group = String(req.query.group);

    const plans = await PeriodPlan.find(filter)
      .sort({ startDate: -1 })
      .populate("weeklyPlans.sessions.session", "title sport totalDuration")
      .populate("createdBy", "name");
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:id
router.get("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id)
      .populate("weeklyPlans.sessions.session", "title description sport totalDuration blocks date")
      .populate("createdBy", "name");
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // Check the user has access
    const isOwner = plan.createdBy._id.toString() === req.user._id.toString();
    const isGroupShared = plan.visibility === "group" && req.userTrainerGroupIds?.some((gid) => gid.toString() === plan.group?.toString());
    if (!isOwner && !isGroupShared) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans
router.post(
  "/",
  authenticate,
  resolveUserGroups,
  checkLimit("plans"),
  [
    body("title").trim().notEmpty().isLength({ max: 200 }),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility } = req.body;

      // Validate group membership when sharing with a group
      if (group && visibility && visibility !== "private") {
        const isMember = req.userTrainerGroupIds?.some((gid) => gid.toString() === group.toString());
        if (!isMember) {
          return res.status(403).json({ error: "You are not a member of this group" });
        }
      }

      const plan = await PeriodPlan.create({ title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility, createdBy: req.user._id });
      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/plans/:id
router.put(
  "/:id",
  authenticate,
  resolveUserGroups,
  checkOwnership(PeriodPlan, { resourceName: "Plan" }),
  [
    body("title").optional().trim().notEmpty().isLength({ max: 200 }),
    body("startDate").optional().isISO8601(),
    body("endDate").optional().isISO8601(),
    body("description").optional().isLength({ max: 5000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const plan = req.resource;
      const { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility } = req.body;
      Object.assign(plan, { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility });
      await plan.save();
      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/plans/:id
router.delete(
  "/:id",
  authenticate,
  resolveUserGroups,
  checkOwnership(PeriodPlan, { resourceName: "Plan" }),
  async (req, res, next) => {
    try {
      await req.resource.deleteOne();
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
