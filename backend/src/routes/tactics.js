const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { parsePagination } = require("../middleware/pagination");
const { checkOwnership } = require("../middleware/checkOwnership");
const TacticBoard = require("../models/TacticBoard");

router.use(authenticate);

// GET /api/tactics
router.get("/", async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.sport) filter.sport = String(req.query.sport);
    if (req.query.drill) filter.drill = String(req.query.drill);

    const { page, limit, skip } = parsePagination(req.query);

    const [boards, total] = await Promise.all([
      TacticBoard.find(filter)
        .select("title sport fieldType homeTeam awayTeam updatedAt drill tags")
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
    const board = await TacticBoard.findById(req.params.id);
    if (!board) return res.status(404).json({ error: "Not found" });
    if (
      board.createdBy.toString() !== req.user._id.toString() &&
      !board.isPublic
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(board);
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
      const board = await TacticBoard.create({
        ...req.body,
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
  async (req, res, next) => {
  try {
    const board = req.resource;

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

// DELETE /api/tactics/:id
router.delete(
  "/:id",
  checkOwnership(TacticBoard, { resourceName: "Tactic board", allowGroupTrainer: false }),
  async (req, res, next) => {
  try {
    await req.resource.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
