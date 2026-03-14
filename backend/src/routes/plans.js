const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const PeriodPlan = require("../models/PeriodPlan");
const { indexPlan } = require("../services/sync");

// GET /api/plans
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = req.query.sport;

    const plans = await PeriodPlan.find(filter).sort({ startDate: -1 });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:id
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const plan = await PeriodPlan.findById(req.params.id)
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
