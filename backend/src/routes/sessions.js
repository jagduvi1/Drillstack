const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const TrainingSession = require("../models/TrainingSession");
const Drill = require("../models/Drill");
const { indexSession } = require("../services/sync");

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

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/sessions
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = String(req.query.sport);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      TrainingSession.find(filter)
        .populate(POPULATE_BLOCKS)
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
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const session = await TrainingSession.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

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
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const session = await TrainingSession.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
