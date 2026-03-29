const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { signToken, authenticate } = require("../middleware/auth");
const { checkIsSuperAdmin } = require("../middleware/superAdmin");
const User = require("../models/User");

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
      if (exists) return res.status(409).json({ error: "Email already registered" });

      const user = await User.create({ name, email, password, sports });
      res.status(201).json({ user, token: signToken(user._id) });
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
      res.json({ user, token: signToken(user._id) });
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
