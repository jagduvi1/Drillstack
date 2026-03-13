const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const PeriodPlan = require("../models/PeriodPlan");
const TrainingSession = require("../models/TrainingSession");
const Drill = require("../models/Drill");
const { indexPlan } = require("../services/sync");

// ── Coverage tracking helper ────────────────────────────────────────────────

async function computeCoverage(plan) {
  const sessionIds = plan.weeklyPlans.flatMap((w) => w.sessions);
  const sessions = await TrainingSession.find({ _id: { $in: sessionIds } });
  const drillIds = sessions.flatMap((s) =>
    s.sections.flatMap((sec) => sec.drills.map((d) => d.drill))
  );
  const drills = await Drill.find({ _id: { $in: drillIds } }).populate("tags.taxonomy");

  const tagCount = {};
  for (const drill of drills) {
    for (const tag of drill.tags || []) {
      const key = `${tag.category}:${tag.taxonomy?.name || tag.taxonomy}`;
      tagCount[key] = (tagCount[key] || 0) + 1;
    }
  }
  return tagCount;
}

// GET /api/plans
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = req.query.sport;

    const plans = await PeriodPlan.find(filter)
      .populate("focusBlocks.tags", "name category")
      .sort({ startDate: -1 });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:id
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id)
      .populate("focusBlocks.tags", "name category")
      .populate({
        path: "weeklyPlans.sessions",
        select: "title date totalDuration",
      })
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
  [
    body("title").trim().notEmpty(),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const plan = await PeriodPlan.create({ ...req.body, createdBy: req.user._id });
      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/plans/:id
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    indexPlan(plan).catch((e) => console.error("Index error:", e.message));
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:id/coverage
router.get("/:id/coverage", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    const coverage = await computeCoverage(plan);
    res.json(coverage);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plans/:id
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
