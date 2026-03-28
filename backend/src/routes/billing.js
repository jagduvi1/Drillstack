const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { PLANS, getPlan, getLimit, isUnlimited } = require("../config/plans");
const { getEffectivePlan } = require("../middleware/planLimits");
const User = require("../models/User");
const { resetAiUsageIfNeeded } = require("../utils/resetAiUsage");
const Drill = require("../models/Drill");
const TrainingSession = require("../models/TrainingSession");
const PeriodPlan = require("../models/PeriodPlan");
const Group = require("../models/Group");

// GET /api/billing/plans — list available plans
router.get("/plans", (_req, res) => {
  const plans = Object.entries(PLANS).map(([id, plan]) => ({
    id,
    ...plan,
  }));
  res.json(plans);
});

// GET /api/billing/usage — current user's usage vs limits
router.get("/usage", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const effectivePlan = getEffectivePlan(user);
    const planInfo = getPlan(effectivePlan);
    const basePlan = user.plan || "starter";

    const [drills, sessions, plans, groups] = await Promise.all([
      Drill.countDocuments({ createdBy: req.user._id }),
      TrainingSession.countDocuments({ createdBy: req.user._id }),
      PeriodPlan.countDocuments({ createdBy: req.user._id }),
      Group.countDocuments({ "members.user": req.user._id, createdBy: req.user._id }),
    ]);

    // Reset AI counter if month changed
    if (resetAiUsageIfNeeded(user)) {
      await user.save();
    }
    const aiUsed = user.aiRequestsUsed || 0;

    // Trial info
    const now = new Date();
    const trialActive = user.trialPlan && user.trialEndsAt && new Date(user.trialEndsAt) > now;
    const trial = {
      active: !!trialActive,
      plan: user.trialPlan || null,
      endsAt: user.trialEndsAt || null,
      daysLeft: trialActive ? Math.ceil((new Date(user.trialEndsAt) - now) / (24 * 60 * 60 * 1000)) : 0,
      used: !!user.trialUsed,
      canStartTrial: !user.trialUsed,
    };

    res.json({
      plan: basePlan,
      effectivePlan,
      planName: planInfo.name,
      priceLabel: planInfo.priceLabel,
      trial,
      usage: {
        drills: { used: drills, limit: getLimit(effectivePlan, "drills"), unlimited: isUnlimited(effectivePlan, "drills") },
        sessions: { used: sessions, limit: getLimit(effectivePlan, "sessions"), unlimited: isUnlimited(effectivePlan, "sessions") },
        plans: { used: plans, limit: getLimit(effectivePlan, "plans"), unlimited: isUnlimited(effectivePlan, "plans") },
        groups: { used: groups, limit: getLimit(effectivePlan, "groups"), unlimited: isUnlimited(effectivePlan, "groups") },
        aiRequestsPerMonth: { used: aiUsed, limit: getLimit(effectivePlan, "aiRequestsPerMonth"), unlimited: isUnlimited(effectivePlan, "aiRequestsPerMonth") },
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/plan — change plan (no payment yet — just updates the plan field)
router.put("/plan", authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    await User.findByIdAndUpdate(req.user._id, { plan });
    res.json({ plan, message: `Switched to ${PLANS[plan].name} plan` });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/start-trial — start a Pro trial (30 days)
router.post("/start-trial", authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.trialUsed) {
      return res.status(400).json({ error: "You've already used your free trial" });
    }
    if (user.plan === "pro") {
      return res.status(400).json({ error: "You're already on the Pro plan" });
    }

    const trialDays = 30;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + trialDays);

    user.trialPlan = "pro";
    user.trialEndsAt = endsAt;
    user.trialUsed = true;
    await user.save();

    res.json({
      message: `Pro trial started! You have ${trialDays} days of unlimited access.`,
      trialEndsAt: endsAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
