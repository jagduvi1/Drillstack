const { getLimit, isUnlimited } = require("../config/plans");
const Drill = require("../models/Drill");
const TrainingSession = require("../models/TrainingSession");
const PeriodPlan = require("../models/PeriodPlan");
const Group = require("../models/Group");
const User = require("../models/User");
const { resetAiUsageIfNeeded } = require("../utils/resetAiUsage");

/**
 * Resolve the effective plan for a user, considering active trials.
 */
function getEffectivePlan(user) {
  if (user.trialPlan && user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
    return user.trialPlan; // Trial is active
  }
  return user.plan || "starter";
}

/**
 * Check if creating a new resource would exceed the user's plan limit.
 * Usage: checkLimit("drills") as middleware before POST routes.
 */
function checkLimit(resource) {
  return async (req, res, next) => {
    try {
      const plan = getEffectivePlan(req.user);
      const limit = getLimit(plan, resource);

      if (isUnlimited(plan, resource)) return next();

      let count = 0;
      switch (resource) {
        case "drills":
          count = await Drill.countDocuments({ createdBy: req.user._id });
          break;
        case "sessions":
          count = await TrainingSession.countDocuments({ createdBy: req.user._id });
          break;
        case "plans":
          count = await PeriodPlan.countDocuments({ createdBy: req.user._id });
          break;
        case "groups":
          count = await Group.countDocuments({
            "members.user": req.user._id,
            createdBy: req.user._id,
          });
          break;
        default:
          return next();
      }

      if (count >= limit) {
        const { getPlan } = require("../config/plans");
        const planInfo = getPlan(plan);
        return res.status(403).json({
          error: `You've reached the ${resource} limit (${limit}) on the ${planInfo.name} plan. Upgrade to create more.`,
          limitReached: true,
          resource,
          limit,
          current: count,
          plan,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Check AI request limits. Resets monthly.
 */
async function checkAiLimit(req, res, next) {
  try {
    const plan = getEffectivePlan(req.user);
    const limit = getLimit(plan, "aiRequestsPerMonth");

    if (isUnlimited(plan, "aiRequestsPerMonth")) return next();

    const user = await User.findById(req.user._id);

    // Reset counter if a month has passed
    if (resetAiUsageIfNeeded(user)) {
      await user.save();
    }

    if (user.aiRequestsUsed >= limit) {
      const { getPlan } = require("../config/plans");
      const planInfo = getPlan(plan);
      return res.status(403).json({
        error: `You've used all ${limit} AI requests this month on the ${planInfo.name} plan. Upgrade for more.`,
        limitReached: true,
        resource: "aiRequestsPerMonth",
        limit,
        current: user.aiRequestsUsed,
        plan,
      });
    }

    await User.updateOne({ _id: req.user._id }, { $inc: { aiRequestsUsed: 1 } });

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkLimit, checkAiLimit, getEffectivePlan };
