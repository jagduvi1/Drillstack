const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { signToken, signRefreshToken, hashToken, authenticate, REFRESH_SECRET } = require("../../middleware/auth");
const { checkIsSuperAdmin } = require("../../middleware/superAdmin");
const { isEmailEnabled, sendVerificationEmail } = require("../../services/email");
const { loginLimiter, registerLimiter, refreshLimiter } = require("../../utils/rateLimiters");
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
router.get("/me", authenticate, (req, res) => {
  const user = req.user.toJSON();
  user.isSuperAdmin = checkIsSuperAdmin(req.user);
  res.json({ user });
});

module.exports = router;
