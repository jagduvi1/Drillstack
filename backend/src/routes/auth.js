const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { signToken, authenticate } = require("../middleware/auth");
const { checkIsSuperAdmin } = require("../middleware/superAdmin");
const User = require("../models/User");

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, sports } = req.body;
      const exists = await User.findOne({ email });
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
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
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
