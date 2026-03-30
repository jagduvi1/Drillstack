const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { parsePagination } = require("../middleware/pagination");
const { checkOwnership } = require("../middleware/checkOwnership");
const TacticBoard = require("../models/TacticBoard");
const { standardLimiter } = require("../utils/rateLimiters");

router.use(standardLimiter);
router.use(authenticate);

// GET /api/tactics
router.get("/", async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.drill) {
      filter.drill = String(req.query.drill);
    } else {
      // By default, exclude drill-linked tactics from the personal list
      filter.drill = null;
    }
    // Exclude version snapshots
    filter.parentTactic = null;

    const { page, limit, skip } = parsePagination(req.query);

    const [boards, total] = await Promise.all([
      TacticBoard.find(filter)
        .select("title sport fieldType homeTeam awayTeam updatedAt drill tags createdBy")
        .populate("drill", "title")
        .populate("createdBy", "name")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      TacticBoard.countDocuments(filter),
    ]);

    res.json({ boards, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/tactics/:id
router.get("/:id", async (req, res, next) => {
  try {
    const board = await TacticBoard.findById(req.params.id)
      .populate("drill", "title createdBy")
      .populate("createdBy", "name");
    if (!board) return res.status(404).json({ error: "Not found" });
    const isOwner = board.createdBy._id.toString() === req.user._id.toString();
    if (!isOwner && !board.isPublic) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const obj = board.toObject();
    obj.isOwner = isOwner;
    res.json(obj);
  } catch (err) {
    next(err);
  }
});

// POST /api/tactics
router.post(
  "/",
  [body("title").trim().notEmpty().withMessage("Title is required")],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, sport, fieldType, homeTeam, awayTeam, steps, isPublic, group, tags, drill } = req.body;
      if (drill) {
        const drillId = String(drill);
        const Drill = require("../models/Drill");
        const drillDoc = await Drill.findById(drillId).select("createdBy");
        if (!drillDoc) return res.status(400).json({ error: "Referenced drill not found" });
        if (drillDoc.createdBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: "You can only link tactic boards to your own drills. Fork the drill first." });
        }
      }
      const board = await TacticBoard.create({
        title, description, sport, fieldType, homeTeam, awayTeam, steps, isPublic, group, tags,
        drill: drill ? String(drill) : undefined,
        createdBy: req.user._id,
      });
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/tactics/:id
router.put(
  "/:id",
  checkOwnership(TacticBoard, { resourceName: "Tactic board", allowGroupTrainer: false }),
  [
    body("title").optional().trim().notEmpty().isLength({ max: 200 }),
    body("description").optional().isLength({ max: 5000 }),
    body("fieldType").optional().isIn(["full", "half", "third", "blank"]),
    body("steps").optional().isArray({ max: 50 }),
  ],
  validate,
  async (req, res, next) => {
  try {
    const board = req.resource;

    // If drill-linked, save a version snapshot before editing
    if (board.drill && req.body.steps) {
      const rootId = board.parentTactic || board._id;
      const versionCount = await TacticBoard.countDocuments({
        $or: [{ _id: rootId }, { parentTactic: rootId }],
      });
      await TacticBoard.create({
        title: board.title,
        description: board.description,
        sport: board.sport,
        fieldType: board.fieldType,
        homeTeam: board.homeTeam,
        awayTeam: board.awayTeam,
        steps: board.steps,
        tags: [...board.tags],
        drill: null,
        parentTactic: rootId,
        version: versionCount + 1,
        versionName: `v${versionCount} snapshot`,
        createdBy: board.createdBy,
      });
    }

    const allowed = [
      "title",
      "description",
      "sport",
      "fieldType",
      "homeTeam",
      "awayTeam",
      "steps",
      "isPublic",
      "group",
      "tags",
      "drill",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) board[key] = req.body[key];
    }

    await board.save();
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// GET /api/tactics/:id/versions — list all versions of a tactic
router.get("/:id/versions", async (req, res, next) => {
  try {
    const tactic = await TacticBoard.findById(req.params.id);
    if (!tactic) return res.status(404).json({ error: "Tactic not found" });
    const rootId = tactic.parentTactic || tactic._id;
    const versions = await TacticBoard.find({
      $or: [{ _id: rootId }, { parentTactic: rootId }],
    })
      .select("title version versionName updatedAt createdBy")
      .populate("createdBy", "name")
      .sort({ version: 1 });
    res.json({ versions, rootId: rootId.toString() });
  } catch (err) {
    next(err);
  }
});

// POST /api/tactics/:id/clone — clone a tactic to personal (removes drill link)
router.post("/:id/clone", async (req, res, next) => {
  try {
    const original = await TacticBoard.findById(req.params.id);
    if (!original) return res.status(404).json({ error: "Tactic not found" });
    const isOwner = original.createdBy.toString() === req.user._id.toString();
    if (!isOwner && !original.isPublic && !original.drill) {
      return res.status(403).json({ error: "Not authorized to clone this tactic" });
    }
    const clone = await TacticBoard.create({
      title: `${original.title} (copy)`,
      description: original.description,
      sport: original.sport,
      fieldType: original.fieldType,
      homeTeam: original.homeTeam,
      awayTeam: original.awayTeam,
      steps: original.steps,
      tags: [...original.tags],
      drill: null,
      parentTactic: null,
      isPublic: false,
      createdBy: req.user._id,
    });
    res.status(201).json(clone);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tactics/:id
router.delete(
  "/:id",
  checkOwnership(TacticBoard, { resourceName: "Tactic board", allowGroupTrainer: false }),
  async (req, res, next) => {
  try {
    if (req.resource.drill) {
      return res.status(400).json({ error: "Cannot delete a drill-linked tactic. Remove it from the drill instead." });
    }
    await req.resource.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
