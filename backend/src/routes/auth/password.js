const router = require("express").Router();
const crypto = require("crypto");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { isEmailEnabled, sendPasswordResetEmail } = require("../../services/email");
const { createLimiter } = require("../../utils/rateLimiters");
const User = require("../../models/User");

// ── Password reset rate limiters ──────────────────────────────────────────────
const forgotPasswordLimiter = createLimiter(60 * 60 * 1000, 5, { message: { error: "Too many attempts, please try again later" } });
const resetPasswordLimiter = createLimiter(60 * 60 * 1000, 10, { message: { error: "Too many attempts, please try again later" } });

/** Add small random delay to prevent timing-based token enumeration */
function randomDelay() {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
}

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

module.exports = router;
