const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { standardLimiter } = require("../utils/rateLimiters");
const Player = require("../models/Player");
const Group = require("../models/Group");

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
    const allowed = ["name", "position", "number", "strengths", "weaknesses", "notes", "active"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
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

module.exports = router;
