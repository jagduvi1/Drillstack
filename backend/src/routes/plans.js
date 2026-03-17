const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const PeriodPlan = require("../models/PeriodPlan");
const { indexPlan } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");

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
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id)
      .populate("weeklyPlans.sessions.session", "title description sport totalDuration blocks date")
      .populate("createdBy", "name");
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans
router.post(
  "/",
  authenticate,
  checkLimit("plans"),
  [
    body("title").trim().notEmpty(),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility } = req.body;
      const plan = await PeriodPlan.create({ title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility, createdBy: req.user._id });
      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/plans/:id
router.put("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const isOwner = plan.createdBy.toString() === req.user._id.toString();
    const isGroupMember = plan.group && req.userTrainerGroupIds &&
      req.userTrainerGroupIds.some((gid) => gid.toString() === plan.group.toString());
    if (!isOwner && !isGroupMember) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility } = req.body;
    Object.assign(plan, { title, description, sport, startDate, endDate, goals, focusAreas, weeklyPlans, group, visibility });
    await plan.save();
    indexPlan(plan).catch((e) => console.error("Index error:", e.message));
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plans/:id
router.delete("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const isOwner = plan.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = plan.group && req.userTrainerGroupIds &&
      req.userTrainerGroupIds.some((gid) => gid.toString() === plan.group.toString());
    if (!isOwner && !isGroupAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await plan.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
