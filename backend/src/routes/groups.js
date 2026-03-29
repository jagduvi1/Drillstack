const router = require("express").Router();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const Group = require("../models/Group");
const User = require("../models/User");
const { checkLimit } = require("../middleware/planLimits");
const { getEffectivePlan } = require("../middleware/planLimits");

const memberLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
const joinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMemberRole(group, userId) {
  const m = group.members.find((m) => m.user.toString() === userId.toString());
  return m ? m.role : null;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/groups — list user's groups (clubs + teams)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id })
      .populate("members.user", "name email")
      .populate("parentClub", "name")
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

// POST /api/groups — create a club or a standalone team
router.post(
  "/",
  authenticate,
  checkLimit("groups"),
  [body("name").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const isClub = req.body.type === "club";

      // Clubs require Coach plan or higher
      if (isClub) {
        const user = await User.findById(req.user._id);
        const plan = getEffectivePlan(user);
        if (plan === "starter") {
          return res.status(403).json({ error: "Coach plan or higher required to create a club. Upgrade your plan to unlock clubs." });
        }
      }

      const group = new Group({
        name: req.body.name,
        description: req.body.description || "",
        sport: req.body.sport || "",
        type: isClub ? "club" : "team",
        parentClub: null,
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: "admin" }],
      });
      await group.save();
      await group.populate("members.user", "name email");
      res.status(201).json(group);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/groups/:id — get group details
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members.user", "name email")
      .populate("parentClub", "name");
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!getMemberRole(group, req.user._id)) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// PUT /api/groups/:id — update group
router.put("/:id", authenticate, [
  body("name").optional().trim().notEmpty().isLength({ max: 100 }),
  body("description").optional().isLength({ max: 1000 }),
  body("sport").optional().trim().isLength({ max: 100 }),
], validate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (getMemberRole(group, req.user._id) !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    group.name = req.body.name || group.name;
    group.description = req.body.description ?? group.description;
    group.sport = req.body.sport ?? group.sport;
    await group.save();
    await group.populate("members.user", "name email");
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id — delete group
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (getMemberRole(group, req.user._id) !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    // If this is a club, unlink its teams (they become standalone again)
    if (group.type === "club") {
      await Group.updateMany({ parentClub: group._id }, { $set: { parentClub: null } });
    }
    await group.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

// ── Teams under clubs ────────────────────────────────────────────────────────

// POST /api/groups/:id/teams — create a new team under a club
router.post(
  "/:id/teams",
  authenticate,
  [body("name").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const club = await Group.findById(req.params.id);
      if (!club) return res.status(404).json({ error: "Club not found" });
      if (club.type !== "club") return res.status(400).json({ error: "Can only add teams to a club" });
      if (getMemberRole(club, req.user._id) !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const team = new Group({
        name: req.body.name,
        description: req.body.description || "",
        sport: req.body.sport || club.sport || "",
        type: "team",
        parentClub: club._id,
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: "admin" }],
      });
      await team.save();
      await team.populate("members.user", "name email");
      res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/groups/:id/teams — list teams under a club
router.get("/:id/teams", authenticate, async (req, res, next) => {
  try {
    const club = await Group.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found" });
    if (!getMemberRole(club, req.user._id)) {
      return res.status(403).json({ error: "Not a member" });
    }
    const teams = await Group.find({ parentClub: club._id })
      .populate("members.user", "name email")
      .sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/invite-team — invite an existing team to join this club (by team invite code)
router.post(
  "/:id/invite-team",
  authenticate,
  [body("inviteCode").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const club = await Group.findById(req.params.id);
      if (!club) return res.status(404).json({ error: "Club not found" });
      if (club.type !== "club") return res.status(400).json({ error: "Only clubs can invite teams" });
      if (getMemberRole(club, req.user._id) !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const team = await Group.findOne({ inviteCode: req.body.inviteCode });
      if (!team) return res.status(404).json({ error: "No team found with that invite code" });
      if (team.type !== "team") return res.status(400).json({ error: "That invite code belongs to a club, not a team" });
      if (team.parentClub) return res.status(400).json({ error: "That team already belongs to a club" });

      team.parentClub = club._id;
      await team.save();
      await team.populate("members.user", "name email");
      res.json(team);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/groups/:id/leave-club — team leaves its parent club (team admin only)
router.post("/:id/leave-club", authenticate, async (req, res, next) => {
  try {
    const team = await Group.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (!team.parentClub) return res.status(400).json({ error: "Team is not part of a club" });
    if (getMemberRole(team, req.user._id) !== "admin") {
      return res.status(403).json({ error: "Team admin access required" });
    }
    team.parentClub = null;
    await team.save();
    res.json({ message: "Left club" });
  } catch (err) {
    next(err);
  }
});

// ── Members ──────────────────────────────────────────────────────────────────

// POST /api/groups/:id/members — add a member by email
router.post(
  "/:id/members",
  authenticate,
  memberLimiter,
  [body("email").isEmail()],
  validate,
  async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (getMemberRole(group, req.user._id) !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const user = await User.findOne({ email: req.body.email.toLowerCase() });
      if (!user) return res.status(404).json({ error: "User not found with that email" });
      if (group.members.some((m) => m.user.toString() === user._id.toString())) {
        return res.status(400).json({ error: "User is already a member" });
      }
      group.members.push({ user: user._id, role: req.body.role || "member" });
      await group.save();
      await group.populate("members.user", "name email");
      res.json(group);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/groups/:id/members/:userId — change role
router.put("/:id/members/:userId", authenticate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (getMemberRole(group, req.user._id) !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const member = group.members.find((m) => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    member.role = req.body.role || member.role;
    await group.save();
    await group.populate("members.user", "name email");
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id/members/:userId — remove member (or leave)
router.delete("/:id/members/:userId", authenticate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const isAdmin = getMemberRole(group, req.user._id) === "admin";
    const isSelf = req.params.userId === req.user._id.toString();
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Admin access required" });
    }
    group.members = group.members.filter((m) => m.user.toString() !== req.params.userId);
    await group.save();
    await group.populate("members.user", "name email");
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// ── Invite ───────────────────────────────────────────────────────────────────

// POST /api/groups/join/:code — join via invite code
router.post("/join/:code", authenticate, joinLimiter, async (req, res, next) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code });
    if (!group) return res.status(400).json({ error: "Could not join group" });
    if (group.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: "Already a member" });
    }
    group.members.push({ user: req.user._id, role: "member" });
    await group.save();
    await group.populate("members.user", "name email");
    res.json(group);
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/regenerate-invite — new invite code
router.post("/:id/regenerate-invite", authenticate, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (getMemberRole(group, req.user._id) !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    group.inviteCode = crypto.randomBytes(16).toString("hex");
    await group.save();
    res.json({ inviteCode: group.inviteCode });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
