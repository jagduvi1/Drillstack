const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { standardLimiter } = require("../utils/rateLimiters");
const Player = require("../models/Player");
const Group = require("../models/Group");
const PlayerSkillHistory = require("../models/PlayerSkillHistory");
const PlayerGoal = require("../models/PlayerGoal");
const PlayerNote = require("../models/PlayerNote");
const PlayerMetrics = require("../models/PlayerMetrics");
const TrainingSession = require("../models/TrainingSession");
const { encrypt, encryptNumber } = require("../utils/encryption");

router.use(standardLimiter);
router.use(authenticate);

function getMemberRole(group, userId) {
  const uid = userId.toString();
  const m = group.members.find((m) => {
    const mid = m.user?._id ? m.user._id.toString() : m.user.toString();
    return mid === uid;
  });
  return m ? m.role : null;
}

const ROLE_LEVELS = { owner: 4, admin: 3, trainer: 2, viewer: 1 };
function hasRole(group, userId, minRole) {
  const role = getMemberRole(group, userId);
  return role ? (ROLE_LEVELS[role] || 0) >= (ROLE_LEVELS[minRole] || 0) : false;
}

// GET /api/players/:groupId — list players for a group
router.get("/:groupId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) {
      return res.status(403).json({ error: "Not a member" });
    }
    const filter = { group: req.params.groupId };
    if (req.query.active !== "all") filter.active = true;
    const players = await Player.find(filter).sort({ name: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// POST /api/players/:groupId — add a player
router.post(
  "/:groupId",
  [body("name").trim().notEmpty().isLength({ max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!hasRole(group, req.user._id, "trainer")) {
        return res.status(403).json({ error: "Trainer access required" });
      }
      const player = await Player.create({
        name: req.body.name,
        group: req.params.groupId,
        position: req.body.position || "",
        defencePosition: req.body.defencePosition || "",
        number: req.body.number || null,
        strengths: req.body.strengths || [],
        weaknesses: req.body.weaknesses || [],
        notes: req.body.notes || "",
        createdBy: req.user._id,
      });
      res.status(201).json(player);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/players/:groupId/:playerId — update a player
router.put("/:groupId/:playerId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) {
      return res.status(403).json({ error: "Trainer access required" });
    }
    const allowed = [
      "name", "position", "defencePosition", "number", "strengths", "weaknesses", "notes", "active",
      "dateOfBirth", "height", "weight", "preferredFoot", "preferredHand", "photoUrl", "skillRating",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Track skill rating change in history
    if (update.skillRating !== undefined) {
      const existing = await Player.findOne({ _id: req.params.playerId, group: req.params.groupId });
      if (existing && existing.skillRating !== null && existing.skillRating !== update.skillRating) {
        await PlayerSkillHistory.create({
          player: req.params.playerId,
          group: req.params.groupId,
          metric: "overall",
          oldValue: existing.skillRating,
          newValue: update.skillRating,
          changedBy: req.user._id,
          note: req.body.ratingNote || "",
        });
      }
    }

    // Encrypt PII fields before update (pre-save hooks don't run on findOneAndUpdate)
    if (update.notes) update.notes = encrypt(update.notes);
    if (update.photoUrl) update.photoUrl = encrypt(update.photoUrl);
    if (update.height != null) update.height = encryptNumber(update.height);
    if (update.weight != null) update.weight = encryptNumber(update.weight);

    const player = await Player.findOneAndUpdate(
      { _id: req.params.playerId, group: req.params.groupId },
      { $set: update },
      { new: true }
    );
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/players/:groupId/:playerId — remove a player
router.delete("/:groupId/:playerId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) {
      return res.status(403).json({ error: "Trainer access required" });
    }
    await Player.findOneAndDelete({ _id: req.params.playerId, group: req.params.groupId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Single player profile ───────────────────────────────────────────────────

// GET /api/players/:groupId/:playerId/overview — aggregated profile data
router.get("/:groupId/:playerId/overview", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const player = await Player.findOne({ _id: req.params.playerId, group: req.params.groupId });
    if (!player) return res.status(404).json({ error: "Player not found" });

    const [metrics, goals, recentNotes, history, attendedSessions] = await Promise.all([
      PlayerMetrics.findOne({ player: player._id }),
      PlayerGoal.find({ player: player._id, status: "active" }).sort({ createdAt: -1 }).limit(10),
      PlayerNote.find({ player: player._id }).sort({ createdAt: -1 }).limit(5).populate("createdBy", "name"),
      PlayerSkillHistory.find({ player: player._id }).sort({ createdAt: -1 }).limit(50),
      TrainingSession.countDocuments({ attendees: player._id, group: req.params.groupId }),
    ]);

    // Attendance rate: sessions in last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [totalRecent, attendedRecent] = await Promise.all([
      TrainingSession.countDocuments({ group: req.params.groupId, date: { $gte: ninetyDaysAgo } }),
      TrainingSession.countDocuments({ attendees: player._id, group: req.params.groupId, date: { $gte: ninetyDaysAgo } }),
    ]);

    res.json({
      player: { ...player.toObject(), group: { _id: group._id, sport: group.sport } },
      metrics: metrics ? Object.fromEntries(metrics.ratings) : {},
      goals,
      recentNotes,
      history,
      attendance: {
        total: attendedSessions,
        recentTotal: totalRecent,
        recentAttended: attendedRecent,
        rate: totalRecent > 0 ? Math.round((attendedRecent / totalRecent) * 100) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Metrics ─────────────────────────────────────────────────────────────────

// GET /api/players/:groupId/:playerId/metrics
router.get("/:groupId/:playerId/metrics", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const metrics = await PlayerMetrics.findOne({ player: req.params.playerId });
    res.json(metrics ? Object.fromEntries(metrics.ratings) : {});
  } catch (err) {
    next(err);
  }
});

// PUT /api/players/:groupId/:playerId/metrics
router.put("/:groupId/:playerId/metrics", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });

    const { ratings, note } = req.body;
    if (!ratings || typeof ratings !== "object") return res.status(400).json({ error: "ratings object required" });

    // Get existing metrics to track changes
    let existing = await PlayerMetrics.findOne({ player: req.params.playerId });
    const oldRatings = existing ? Object.fromEntries(existing.ratings) : {};

    // Sanitize and create history entries for changed metrics
    const historyEntries = [];
    const sanitized = {};
    for (const [metric, newValue] of Object.entries(ratings)) {
      // Determine type from value: boolean = cert, string = level, number = rating
      let val;
      if (typeof newValue === "boolean") {
        val = newValue;
      } else if (typeof newValue === "string" && isNaN(Number(newValue))) {
        val = String(newValue).slice(0, 50);
      } else {
        val = Math.max(0, Math.min(100, Math.round(Number(newValue))));
      }
      sanitized[metric] = val;

      const oldVal = oldRatings[metric];
      if (oldVal !== val && (oldVal !== undefined || val !== 0)) {
        historyEntries.push({
          player: req.params.playerId,
          group: req.params.groupId,
          metric,
          oldValue: oldVal ?? (typeof val === "boolean" ? false : typeof val === "string" ? "" : 0),
          newValue: val,
          changedBy: req.user._id,
          note: note || "",
        });
      }
    }

    if (historyEntries.length > 0) {
      await PlayerSkillHistory.insertMany(historyEntries);
    }

    if (existing) {
      for (const [k, v] of Object.entries(sanitized)) existing.ratings.set(k, v);
      await existing.save();
    } else {
      existing = await PlayerMetrics.create({
        player: req.params.playerId,
        group: req.params.groupId,
        ratings: sanitized,
      });
    }

    res.json(Object.fromEntries(existing.ratings));
  } catch (err) {
    next(err);
  }
});

// GET /api/players/:groupId/:playerId/history — skill history
router.get("/:groupId/:playerId/history", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const filter = { player: req.params.playerId };
    if (req.query.metric) filter.metric = req.query.metric;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const history = await PlayerSkillHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("changedBy", "name");
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ── Goals ───────────────────────────────────────────────────────────────────

router.post(
  "/:groupId/:playerId/goals",
  [body("title").trim().notEmpty().isLength({ max: 200 })],
  validate,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });

      const goal = await PlayerGoal.create({
        player: req.params.playerId,
        group: req.params.groupId,
        title: req.body.title,
        description: req.body.description || "",
        metric: req.body.metric || "",
        targetValue: req.body.targetValue ?? null,
        startValue: req.body.startValue ?? null,
        currentValue: req.body.startValue ?? null,
        targetDate: req.body.targetDate || null,
        createdBy: req.user._id,
      });
      res.status(201).json(goal);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:groupId/:playerId/goals", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const filter = { player: req.params.playerId };
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    else if (!req.query.status) filter.status = "active";
    const goals = await PlayerGoal.find(filter).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.put("/:groupId/:playerId/goals/:goalId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });

    const allowed = ["title", "description", "metric", "targetValue", "startValue", "currentValue", "targetDate", "status"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const goal = await PlayerGoal.findOneAndUpdate(
      { _id: req.params.goalId, player: req.params.playerId },
      { $set: update },
      { new: true }
    );
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete("/:groupId/:playerId/goals/:goalId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });
    await PlayerGoal.findOneAndDelete({ _id: req.params.goalId, player: req.params.playerId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Notes ───────────────────────────────────────────────────────────────────

router.post(
  "/:groupId/:playerId/notes",
  [body("content").trim().notEmpty().isLength({ max: 2000 })],
  validate,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });

      const note = await PlayerNote.create({
        player: req.params.playerId,
        group: req.params.groupId,
        content: req.body.content,
        category: req.body.category || "general",
        session: req.body.session || null,
        createdBy: req.user._id,
      });
      await note.populate("createdBy", "name");
      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:groupId/:playerId/notes", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const filter = { player: req.params.playerId };
    if (req.query.category) filter.category = req.query.category;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = parseInt(req.query.offset, 10) || 0;
    const notes = await PlayerNote.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("createdBy", "name");
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

router.delete("/:groupId/:playerId/notes/:noteId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "trainer")) return res.status(403).json({ error: "Trainer access required" });
    await PlayerNote.findOneAndDelete({ _id: req.params.noteId, player: req.params.playerId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Attendance history (derived from sessions) ─────────────────────────────

router.get("/:groupId/:playerId/attendance", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const filter = { group: req.params.groupId };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }

    const sessions = await TrainingSession.find(filter)
      .select("title date attendees")
      .sort({ date: -1 })
      .limit(100);

    const pid = req.params.playerId;
    const sessionList = sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      date: s.date,
      attended: s.attendees.some((a) => a.toString() === pid),
    }));

    const attended = sessionList.filter((s) => s.attended).length;
    res.json({
      sessions: sessionList,
      totalSessions: sessionList.length,
      attended,
      attendanceRate: sessionList.length > 0 ? Math.round((attended / sessionList.length) * 100) : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
