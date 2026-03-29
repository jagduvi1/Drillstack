const router = require("express").Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { signToken, signRefreshToken, hashToken, authenticate, REFRESH_SECRET } = require("../middleware/auth");
const { checkIsSuperAdmin } = require("../middleware/superAdmin");
const { isEmailEnabled, sendVerificationEmail, sendPasswordResetEmail } = require("../services/email");
const User = require("../models/User");

const MAX_REFRESH_TOKENS = 5; // Max sessions per user

// Separate rate limits for login vs register
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts, please try again later" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

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

/** Add small random delay to prevent timing-based token enumeration */
function randomDelay() {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
}

// ── Email verification & password reset rate limiters ───────────────────────
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

// POST /api/auth/verify-email
router.post(
  "/verify-email",
  verifyEmailLimiter,
  [body("token").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const hashedToken = crypto.createHash("sha256").update(req.body.token).digest("hex");
      const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: new Date() },
      });

      await randomDelay();

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      await user.save();

      res.json({ message: "Email verified successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().normalizeEmail()],
  validate,
  async (req, res, next) => {
    try {
      // Always do the same work to prevent timing-based user enumeration
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      const user = await User.findOne({ email: String(req.body.email) });

      if (user) {
        // Rate limit per email: only allow 1 reset email per 5 minutes
        if (user.resetPasswordExpires && user.resetPasswordExpires > new Date(Date.now() - 5 * 60 * 1000)) {
          return res.json({ message: "If an account exists, a reset link has been sent" });
        }

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        if (isEmailEnabled()) {
          await sendPasswordResetEmail(user.email, user.name, rawToken);
        }
      }

      res.json({ message: "If an account exists, a reset link has been sent" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  resetPasswordLimiter,
  [
    body("token").notEmpty(),
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
      const hashedToken = crypto.createHash("sha256").update(req.body.token).digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });

      await randomDelay();

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      user.password = req.body.password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.refreshTokens = []; // Force re-login on all sessions
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/resend-verification
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Per-user rate limit: only allow resend if last token was generated > 2 minutes ago
      if (user.verificationTokenExpires) {
        const tokenAge = Date.now() - (user.verificationTokenExpires.getTime() - 24 * 60 * 60 * 1000);
        if (tokenAge < 2 * 60 * 1000) {
          return res.status(429).json({ error: "Please wait before requesting another verification email" });
        }
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.verificationToken = hashedToken;
      user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      if (isEmailEnabled()) {
        await sendVerificationEmail(user.email, user.name, rawToken);
      }

      res.json({ message: "Verification email sent" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
