const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const { checkOwnership } = require("../middleware/checkOwnership");
const Plan = require("../models/Plan");
const TrainingSession = require("../models/TrainingSession");
const { indexPlan } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");
const { standardLimiter } = require("../utils/rateLimiters");

router.use(standardLimiter);

// ── Helpers ──────────────────────────────────────────────────────────────────

function canAccess(plan, userId, trainerGroupIds) {
  const isOwner = plan.createdBy.toString() === userId.toString();
  if (isOwner) return true;
  if (plan.followers && plan.followers.length && trainerGroupIds?.length) {
    return plan.followers.some((fid) =>
      trainerGroupIds.some((gid) => gid.toString() === fid.toString())
    );
  }
  return false;
}

// ── GET /api/plans ───────────────────────────────────────────────────────────

router.get("/", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const conditions = [{ createdBy: req.user._id }];

    if (req.userTrainerGroupIds?.length) {
      conditions.push({
        followers: { $in: req.userTrainerGroupIds },
        visibility: "group",
      });
    }

    const filter = { $or: conditions };
    if (req.query.sport) filter.sport = String(req.query.sport);

    const plans = await Plan.find(filter)
      .sort({ startDate: -1 })
      .populate("followers", "name")
      .populate("createdBy", "name");

    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/plans/:id ──────────────────────────────────────────────────────

router.get("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate("followers", "name")
      .populate("createdBy", "name");
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (!canAccess(plan, req.user._id, req.userTrainerGroupIds)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Include sessions linked to this plan
    const sessions = await TrainingSession.find({ plan: plan._id })
      .select("title date sport matchScore matchFeedback phase totalDuration")
      .sort({ date: 1 });

    res.json({ ...plan.toObject(), sessions });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/plans ─────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  resolveUserGroups,
  checkLimit("plans"),
  [
    body("name").trim().notEmpty().isLength({ max: 200 }),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, sport, startDate, endDate, objective, phases, followers, visibility } = req.body;

      const plan = await Plan.create({
        name, sport, startDate, endDate, objective,
        phases: phases || [],
        followers: followers || [],
        visibility,
        createdBy: req.user._id,
      });

      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/plans/:id ──────────────────────────────────────────────────────

router.put(
  "/:id",
  authenticate,
  resolveUserGroups,
  checkOwnership(Plan, { resourceName: "Plan", groupField: "followers" }),
  [
    body("name").optional().trim().notEmpty().isLength({ max: 200 }),
    body("startDate").optional().isISO8601(),
    body("endDate").optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const plan = req.resource;
      const { name, sport, startDate, endDate, objective, phases, followers, visibility } = req.body;
      Object.assign(plan, {
        ...(name !== undefined && { name }),
        ...(sport !== undefined && { sport }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(objective !== undefined && { objective }),
        ...(phases !== undefined && { phases }),
        ...(followers !== undefined && { followers }),
        ...(visibility !== undefined && { visibility }),
      });
      await plan.save();

      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/plans/:id ───────────────────────────────────────────────────

router.delete(
  "/:id",
  authenticate,
  resolveUserGroups,
  checkOwnership(Plan, { resourceName: "Plan", groupField: "followers" }),
  async (req, res, next) => {
  try {
    const plan = req.resource;

    // Unlink sessions that reference this plan
    await TrainingSession.updateMany(
      { plan: plan._id },
      { $set: { plan: null, phase: null, matchScore: null, matchFeedback: "" } }
    );

    await plan.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/plans/:id/followers ───────────────────────────────────────────

router.post("/:id/followers", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    if (plan.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: "groupId required" });

    if (!plan.followers.some((f) => f.toString() === groupId.toString())) {
      plan.followers.push(groupId);
      await plan.save();
    }

    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/plans/:id/followers/:groupId ────────────────────────────────

router.delete("/:id/followers/:groupId", authenticate, async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    if (plan.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    plan.followers = plan.followers.filter(
      (f) => f.toString() !== req.params.groupId
    );
    await plan.save();
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
