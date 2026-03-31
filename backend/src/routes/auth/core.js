const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { signToken, signRefreshToken, hashToken, authenticate, REFRESH_SECRET } = require("../../middleware/auth");
const { checkIsSuperAdmin } = require("../../middleware/superAdmin");
const { isEmailEnabled, sendVerificationEmail } = require("../../services/email");
const { loginLimiter, registerLimiter, refreshLimiter, standardLimiter } = require("../../utils/rateLimiters");
const User = require("../../models/User");

const MAX_REFRESH_TOKENS = 5; // Max sessions per user

/** Issue access + refresh tokens and persist refresh token hash */
async function issueTokens(user) {
  const accessToken = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  const hash = hashToken(refreshToken);

  // Parse refresh token expiry from JWT
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  // Clean up expired tokens + cap to MAX_REFRESH_TOKENS (keep newest)
  user.refreshTokens = (user.refreshTokens || [])
    .filter((rt) => rt.expiresAt > new Date())
    .slice(-(MAX_REFRESH_TOKENS - 1));
  user.refreshTokens.push({ hash, expiresAt });
  await user.save();

  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post(
  "/register",
  registerLimiter,
  [
    body("name").trim().notEmpty().isLength({ max: 100 }),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Za-z]/)
      .withMessage("Password must contain at least one letter")
      .matches(/\d/)
      .withMessage("Password must contain at least one number"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, sports } = req.body;
      const exists = await User.findOne({ email: String(email) });
      if (exists) {
        // If unverified and SMTP enabled, allow re-registration (overwrite)
        if (!exists.emailVerified && isEmailEnabled()) {
          await User.deleteOne({ _id: exists._id });
        } else {
          return res.status(409).json({ error: "Email already registered" });
        }
      }

      const user = await User.create({ name, email, password, sports });

      if (isEmailEnabled()) {
        // Generate verification token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        user.verificationToken = hashedToken;
        user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        await sendVerificationEmail(email, name, rawToken);

        const { accessToken, refreshToken } = await issueTokens(user);
        return res.status(201).json({ user, token: accessToken, refreshToken, emailVerificationRequired: true });
      }

      // SMTP not configured — auto-verify
      user.emailVerified = true;
      await user.save();
      const { accessToken, refreshToken } = await issueTokens(user);
      res.status(201).json({ user, token: accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  loginLimiter,
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: String(email) });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Block unverified users when SMTP is enabled
      if (!user.emailVerified && isEmailEnabled()) {
        return res.status(403).json({ error: "Please verify your email first", emailVerificationRequired: true });
      }

      const { accessToken, refreshToken } = await issueTokens(user);
      res.json({ user, token: accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh — exchange refresh token for new access token
router.post(
  "/refresh",
  refreshLimiter,
  [body("refreshToken").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      // Verify JWT signature and expiry
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      } catch {
        return res.status(401).json({ error: "Invalid refresh token" });
      }
      if (decoded.type !== "refresh") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      // Check hash exists in user's stored tokens
      const hash = hashToken(refreshToken);
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ error: "User not found" });

      const tokenIdx = user.refreshTokens.findIndex((rt) => rt.hash === hash && rt.expiresAt > new Date());
      if (tokenIdx === -1) {
        return res.status(401).json({ error: "Refresh token revoked or expired" });
      }

      // Rotate: remove old token, issue new pair
      user.refreshTokens.splice(tokenIdx, 1);
      const newAccessToken = signToken(user._id);
      const newRefreshToken = signRefreshToken(user._id);
      const newHash = hashToken(newRefreshToken);
      const newDecoded = jwt.decode(newRefreshToken);

      user.refreshTokens.push({ hash: newHash, expiresAt: new Date(newDecoded.exp * 1000) });
      await user.save();

      res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout — revoke refresh token
router.post(
  "/logout",
  standardLimiter,
  authenticate,
  [body("refreshToken").optional().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.json({ ok: true });

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      } catch {
        return res.json({ ok: true }); // Already invalid, nothing to revoke
      }

      // Verify the refresh token belongs to the authenticated user
      if (decoded.id !== req.user._id.toString()) {
        return res.status(403).json({ error: "Token does not belong to you" });
      }

      const hash = hashToken(refreshToken);
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { refreshTokens: { hash } } }
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", standardLimiter, authenticate, (req, res) => {
  const user = req.user.toJSON();
  user.isSuperAdmin = checkIsSuperAdmin(req.user);
  res.json({ user });
});

// PUT /api/auth/preferences — update user preferences
router.put("/preferences", standardLimiter, authenticate, async (req, res, next) => {
  try {
    const allowed = ["preferredSport", "name", "hideEmail"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = key === "hideEmail" ? Boolean(req.body[key]) : String(req.body[key]).slice(0, 100);
      }
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/export — download all personal data (GDPR Article 20)
router.get("/export", standardLimiter, authenticate, async (req, res, next) => {
  try {
    const Drill = require("../../models/Drill");
    const TrainingSession = require("../../models/TrainingSession");
    const Group = require("../../models/Group");
    const Notification = require("../../models/Notification");
    const DrillContribution = require("../../models/DrillContribution");
    const TacticBoard = require("../../models/TacticBoard");
    const AuditLog = require("../../models/AuditLog");
    const Player = require("../../models/Player");

    const userId = req.user._id;
    const [user, drills, sessions, groups, notifications, contributions, tactics, players, auditLogs] = await Promise.all([
      User.findById(userId),
      Drill.find({ createdBy: userId }).select("-__v").lean(),
      TrainingSession.find({ createdBy: userId }).select("-__v").lean(),
      Group.find({ "members.user": userId }).select("name type sport").lean(),
      Notification.find({ userId }).select("-__v").lean(),
      DrillContribution.find({ createdBy: userId }).select("-__v").lean(),
      TacticBoard.find({ createdBy: userId }).select("title sport fieldType createdAt").lean(),
      Player.find({ createdBy: userId }).select("-__v").lean(),
      AuditLog.find({ userId }).select("action createdAt details").lean(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      account: { name: user.name, email: user.email, role: user.role, sports: user.sports, preferredSport: user.preferredSport, createdAt: user.createdAt },
      drills: drills.length,
      drillData: drills,
      sessions: sessions.length,
      sessionData: sessions,
      groups: groups,
      notifications: notifications,
      contributions: contributions,
      tacticBoards: tactics,
      players: players,
      activityLog: auditLogs,
    };

    res.setHeader("Content-Disposition", `attachment; filename="drillstack-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/account — delete account and all personal data (GDPR Article 17)
router.delete("/account", standardLimiter, authenticate, async (req, res, next) => {
  try {
    const Drill = require("../../models/Drill");
    const TrainingSession = require("../../models/TrainingSession");
    const Group = require("../../models/Group");
    const Notification = require("../../models/Notification");
    const DrillContribution = require("../../models/DrillContribution");
    const TacticBoard = require("../../models/TacticBoard");
    const AuditLog = require("../../models/AuditLog");
    const Player = require("../../models/Player");
    const Report = require("../../models/Report");

    const userId = req.user._id;

    // Remove user from all groups (but keep team data intact)
    await Group.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // Anonymize team-shared content (keep it, remove personal link)
    await Promise.all([
      // Team sessions/drills: anonymize createdBy instead of deleting
      TrainingSession.updateMany({ createdBy: userId, group: { $ne: null } }, { $set: { createdBy: null } }),
      Drill.updateMany({ createdBy: userId, $or: [{ parentDrill: { $ne: null } }] }, { $set: { createdBy: null } }),
      // Players belong to the team — anonymize creator
      Player.updateMany({ createdBy: userId }, { $set: { createdBy: null } }),
      // Reports — anonymize reporter
      Report.updateMany({ reportedBy: userId }, { $set: { reportedBy: null } }),
    ]);

    // Delete personal content (not shared with teams)
    await Promise.all([
      Drill.deleteMany({ createdBy: userId }),
      TrainingSession.deleteMany({ createdBy: userId }),
      DrillContribution.deleteMany({ createdBy: userId }),
      TacticBoard.deleteMany({ createdBy: userId }),
      Notification.deleteMany({ userId }),
    ]);

    // Anonymize audit logs (keep for security, remove identity)
    await AuditLog.updateMany(
      { userId },
      { $set: { userId: null, email: "", ip: "" } }
    );

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account and all personal data deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
