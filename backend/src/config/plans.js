/**
 * Plan definitions for DrillStack.
 *
 * User plans: starter (free), coach ($1/mo), pro ($5/mo)
 * Club plans: designed for later — clubs can distribute plans to teams/members.
 *
 * Limits set to -1 mean unlimited.
 */

const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    priceLabel: "Free",
    description: "Get started with the basics",
    limits: {
      drills: -1,
      sessions: 5,
      plans: 2,
      groups: 0,
      aiRequestsPerMonth: 5,
      diagramsPerMonth: 3,
    },
    features: [
      "Unlimited drills",
      "Up to 5 sessions",
      "Up to 2 training plans",
      "Join teams (cannot create)",
      "5 AI requests/month",
      "Basic search",
    ],
  },
  coach: {
    name: "Coach",
    price: 1,
    priceLabel: "$1/mo",
    description: "For active coaches and trainers",
    limits: {
      drills: 50,
      sessions: 25,
      plans: 10,
      groups: 3,
      aiRequestsPerMonth: 50,
      diagramsPerMonth: 20,
    },
    features: [
      "Up to 50 drills",
      "Up to 25 sessions",
      "Up to 10 training plans",
      "Up to 3 teams",
      "50 AI requests/month",
      "Semantic search",
      "Drill diagrams",
    ],
  },
  pro: {
    name: "Pro",
    price: 5,
    priceLabel: "$5/mo",
    description: "Unlimited power for serious coaches",
    limits: {
      drills: -1,
      sessions: -1,
      plans: -1,
      groups: -1,
      aiRequestsPerMonth: -1,
      diagramsPerMonth: -1,
    },
    features: [
      "Unlimited drills",
      "Unlimited sessions",
      "Unlimited training plans",
      "Unlimited teams & clubs",
      "Unlimited AI requests",
      "Semantic search",
      "Drill diagrams",
      "Priority support",
    ],
  },
};

// Club plans (not active yet — schema ready for future use)
const CLUB_PLANS = {
  club_basic: {
    name: "Club Basic",
    price: 10,
    priceLabel: "$10/mo",
    description: "For small clubs",
    limits: {
      teams: 5,
      membersPerTeam: 30,
      coachSeats: 5, // number of coach-plan accounts included
    },
  },
  club_premium: {
    name: "Club Premium",
    price: 25,
    priceLabel: "$25/mo",
    description: "For larger clubs",
    limits: {
      teams: -1,
      membersPerTeam: -1,
      coachSeats: 20,
    },
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.starter;
}

function getLimit(planId, limitKey) {
  const plan = getPlan(planId);
  return plan.limits[limitKey] ?? 0;
}

function isUnlimited(planId, limitKey) {
  return getLimit(planId, limitKey) === -1;
}

module.exports = { PLANS, CLUB_PLANS, getPlan, getLimit, isUnlimited };
