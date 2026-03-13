const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const TrainingSession = require("../models/TrainingSession");
const Drill = require("../models/Drill");
const { indexSession } = require("../services/sync");

// ── Helpers ──────────────────────────────────────────────────────────────────

async function computeWarnings(session) {
  const warnings = [];
  const drillIds = session.sections.flatMap((s) => s.drills.map((d) => d.drill));
  const drills = await Drill.find({ _id: { $in: drillIds } }).populate(
    "instructionFocus.active.taxonomy"
  );

  // Check for conflicting instruction focus
  const focuses = drills
    .map((d) => d.instructionFocus?.active?.taxonomy?.name)
    .filter(Boolean);
  const uniqueFocuses = [...new Set(focuses)];
  if (uniqueFocuses.length > 1) {
    warnings.push({
      type: "instruction_focus_conflict",
      message: `Multiple instruction focuses detected: ${uniqueFocuses.join(", ")}`,
    });
  }

  // Check intensity overload
  const highCount = drills.filter((d) => d.intensity === "high").length;
  if (highCount > drills.length * 0.6) {
    warnings.push({
      type: "intensity_overload",
      message: `${highCount} of ${drills.length} drills are high intensity`,
    });
  }

  return warnings;
}

async function computeEquipment(session) {
  const drillIds = session.sections.flatMap((s) => s.drills.map((d) => d.drill));
  const drills = await Drill.find({ _id: { $in: drillIds } }).populate(
    "equipment.taxonomy",
    "name"
  );
  const map = new Map();
  for (const drill of drills) {
    for (const eq of drill.equipment || []) {
      const name = eq.taxonomy?.name || "Unknown";
      map.set(name, (map.get(name) || 0) + eq.quantity);
    }
  }
  return [...map.entries()].map(([name, quantity]) => ({ name, quantity }));
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/sessions
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = req.query.sport;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      TrainingSession.find(filter)
        .populate("sections.drills.drill", "title duration intensity")
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
      .populate({
        path: "sections.drills.drill",
        populate: [
          { path: "tags.taxonomy", select: "name category" },
          { path: "equipment.taxonomy", select: "name" },
        ],
      })
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
      const data = { ...req.body, createdBy: req.user._id };
      const session = new TrainingSession(data);

      // Compute derived fields
      session.warnings = await computeWarnings(session);
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

    Object.assign(session, req.body);
    session.warnings = await computeWarnings(session);
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
