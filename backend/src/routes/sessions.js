const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { resolveUserGroups } = require("../middleware/groupAuth");
const TrainingSession = require("../models/TrainingSession");
const PeriodPlan = require("../models/PeriodPlan");
const Drill = require("../models/Drill");
const { indexSession } = require("../services/sync");
const { checkLimit } = require("../middleware/planLimits");

// ── Helpers ──────────────────────────────────────────────────────────────────

async function computeEquipment(session) {
  const drillIds = [];
  for (const block of session.blocks || []) {
    if (block.type === "drills") {
      drillIds.push(...block.drills.map((d) => d.drill));
    } else if (block.type === "stations") {
      drillIds.push(...block.stations.map((s) => s.drill).filter(Boolean));
    }
  }
  if (drillIds.length === 0) return [];
  const drills = await Drill.find({ _id: { $in: drillIds } });
  const equipmentSet = new Set();
  for (const drill of drills) {
    for (const item of drill.setup?.equipment || []) {
      equipmentSet.add(item);
    }
  }
  return [...equipmentSet];
}

const POPULATE_BLOCKS = [
  { path: "blocks.drills.drill", select: "title intensity setup sport" },
  { path: "blocks.stations.drill", select: "title intensity setup sport" },
];

/** Build a filter that includes own sessions + group-shared sessions */
function buildSessionFilter(req) {
  const conditions = [
    // Own sessions (private or any)
    { createdBy: req.user._id },
  ];

  // Sessions shared with groups the user belongs to
  if (req.userGroupIds && req.userGroupIds.length > 0) {
    conditions.push({
      group: { $in: req.userGroupIds },
      visibility: "group",
    });
  }

  // Sessions shared at club level (visible to all groups under the same club)
  if (req.userClubGroupIds && req.userClubGroupIds.length > 0) {
    conditions.push({
      group: { $in: req.userClubGroupIds },
      visibility: "club",
    });
  }

  return { $or: conditions };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/sessions
router.get("/", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const filter = buildSessionFilter(req);
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.group) filter.group = String(req.query.group);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      TrainingSession.find(filter)
        .populate(POPULATE_BLOCKS)
        .populate("createdBy", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      TrainingSession.countDocuments(filter),
    ]);
    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/today — sessions for today (by date + from active plans)
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

router.get("/today", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const dayName = WEEKDAYS[now.getDay()];

    // 1) Sessions with today's date (own + group shared)
    const dateFilter = buildSessionFilter(req);
    dateFilter.date = { $gte: startOfDay, $lt: endOfDay };
    const dateSessions = await TrainingSession.find(dateFilter).populate(POPULATE_BLOCKS);

    // 2) Plans (own + group shared)
    const planFilter = {
      $or: [
        { createdBy: req.user._id },
        ...(req.userTrainerGroupIds && req.userTrainerGroupIds.length > 0
          ? [{ group: { $in: req.userTrainerGroupIds }, visibility: "group" }]
          : []),
      ],
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    };
    const plans = await PeriodPlan.find(planFilter).populate("weeklyPlans.sessions.session");

    const planSessionIds = new Set();
    const planEntries = [];
    for (const plan of plans) {
      // Figure out which week we're in (1-based: days 0-6 = week 1, days 7-13 = week 2, etc.)
      const planStart = new Date(plan.startDate);
      const planStartDay = new Date(planStart.getFullYear(), planStart.getMonth(), planStart.getDate());
      const daysDiff = Math.max(0, Math.round((startOfDay - planStartDay) / (24 * 60 * 60 * 1000)));
      const weekNum = Math.floor(daysDiff / 7) + 1;
      const week = plan.weeklyPlans.find((w) => w.week === weekNum);
      if (!week) continue;
      for (const entry of week.sessions || []) {
        // Show session if dayOfWeek matches today, or if no day was set (show every day)
        if ((entry.dayOfWeek === dayName || !entry.dayOfWeek) && entry.session) {
          const sid = entry.session._id?.toString() || entry.session.toString();
          if (!planSessionIds.has(sid)) {
            planSessionIds.add(sid);
            planEntries.push({
              planTitle: plan.title,
              planId: plan._id,
              weekNum,
              dayOfWeek: entry.dayOfWeek,
              notes: entry.notes,
              sessionId: sid,
            });
          }
        }
      }
    }

    // Fetch plan sessions with full drill population (plan populate doesn't go deep enough)
    const planSessions = planSessionIds.size > 0
      ? await TrainingSession.find({ _id: { $in: [...planSessionIds] } }).populate(POPULATE_BLOCKS)
      : [];

    // Combine, avoiding duplicates
    const dateIds = new Set(dateSessions.map((s) => s._id.toString()));
    const combined = [...dateSessions.map((s) => ({ session: s, source: "date" }))];

    for (const ps of planSessions) {
      const entry = planEntries.find((e) => e.sessionId === ps._id.toString());
      if (!dateIds.has(ps._id.toString())) {
        combined.push({ session: ps, source: "plan", plan: entry });
      } else {
        // Already in list from date, just add plan info
        const existing = combined.find((c) => c.session._id.toString() === ps._id.toString());
        if (existing) existing.plan = entry;
      }
    }

    res.json(combined);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const session = await TrainingSession.findById(req.params.id)
      .populate(POPULATE_BLOCKS)
      .populate("createdBy", "name");
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions
router.post(
  "/",
  authenticate,
  checkLimit("sessions"),
  [body("title").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, date, sport, blocks, expectedPlayers, expectedTrainers, actualPlayers, actualTrainers, group, visibility, aiGenerated, aiConversation } = req.body;
      const data = { title, description, date, sport, blocks, expectedPlayers, expectedTrainers, actualPlayers, actualTrainers, group, visibility, aiGenerated, aiConversation, createdBy: req.user._id };
      const session = new TrainingSession(data);
      session.equipmentSummary = await computeEquipment(session);
      await session.save();
      indexSession(session).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/sessions/:id
router.put("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const session = await TrainingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Allow edit if owner OR admin/trainer in the session's group
    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isGroupMember = session.group && req.userTrainerGroupIds &&
      req.userTrainerGroupIds.some((gid) => gid.toString() === session.group.toString());
    if (!isOwner && !isGroupMember) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, description, date, sport, blocks, expectedPlayers, expectedTrainers, actualPlayers, actualTrainers, group, visibility, aiGenerated, aiConversation } = req.body;
    Object.assign(session, { title, description, date, sport, blocks, expectedPlayers, expectedTrainers, actualPlayers, actualTrainers, group, visibility, aiGenerated, aiConversation });
    session.equipmentSummary = await computeEquipment(session);
    await session.save();
    indexSession(session).catch((e) => console.error("Index error:", e.message));
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sessions/:id
router.delete("/:id", authenticate, resolveUserGroups, async (req, res, next) => {
  try {
    const session = await TrainingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const isOwner = session.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = session.group && req.userTrainerGroupIds &&
      req.userTrainerGroupIds.some((gid) => gid.toString() === session.group.toString());
    if (!isOwner && !isGroupAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await session.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
