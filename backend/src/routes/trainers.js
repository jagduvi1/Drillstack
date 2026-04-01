const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { standardLimiter } = require("../utils/rateLimiters");
const Trainer = require("../models/Trainer");
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

// GET /api/trainers/:groupId — list trainers for a group
router.get("/:groupId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) return res.status(403).json({ error: "Not a member" });

    const filter = { group: req.params.groupId };
    if (req.query.active !== "all") filter.active = true;
    const trainers = await Trainer.find(filter).sort({ name: 1 });
    res.json(trainers);
  } catch (err) {
    next(err);
  }
});

// POST /api/trainers/:groupId — add a trainer
router.post(
  "/:groupId",
  [body("name").trim().notEmpty().isLength({ max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!hasRole(group, req.user._id, "admin")) return res.status(403).json({ error: "Admin access required" });

      const trainer = await Trainer.create({
        name: req.body.name,
        group: req.params.groupId,
        role: req.body.role || "",
        specialization: req.body.specialization || "",
        certifications: req.body.certifications || [],
        phone: req.body.phone || "",
        email: req.body.email || "",
        notes: req.body.notes || "",
        createdBy: req.user._id,
      });
      res.status(201).json(trainer);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/trainers/:groupId/:trainerId — update a trainer
router.put("/:groupId/:trainerId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "admin")) return res.status(403).json({ error: "Admin access required" });

    const allowed = ["name", "role", "specialization", "certifications", "phone", "email", "notes", "active"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const trainer = await Trainer.findOneAndUpdate(
      { _id: req.params.trainerId, group: req.params.groupId },
      { $set: update },
      { new: true }
    );
    if (!trainer) return res.status(404).json({ error: "Trainer not found" });
    res.json(trainer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trainers/:groupId/:trainerId — remove a trainer
router.delete("/:groupId/:trainerId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!hasRole(group, req.user._id, "admin")) return res.status(403).json({ error: "Admin access required" });

    await Trainer.findOneAndDelete({ _id: req.params.trainerId, group: req.params.groupId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
