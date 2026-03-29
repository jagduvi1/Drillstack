const router = require("express").Router();
const crypto = require("crypto");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { isEmailEnabled, sendVerificationEmail } = require("../../services/email");
const { createLimiter } = require("../../utils/rateLimiters");
const User = require("../../models/User");

// ── Email verification rate limiters ──────────────────────────────────────────
const verifyEmailLimiter = createLimiter(60 * 60 * 1000, 10, { message: { error: "Too many attempts, please try again later" } });
const resendVerificationLimiter = createLimiter(60 * 60 * 1000, 3, { message: { error: "Too many attempts, please try again later" } });

/** Add small random delay to prevent timing-based token enumeration */
function randomDelay() {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
}

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
