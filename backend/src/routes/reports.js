const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { standardLimiter, createLimiter } = require("../utils/rateLimiters");
const Report = require("../models/Report");
const User = require("../models/User");
const { logAudit } = require("../models/AuditLog");

const reportLimiter = createLimiter(60 * 60 * 1000, 10);

router.use(standardLimiter);
router.use(authenticate);

// POST /api/reports — submit a report
router.post(
  "/",
  reportLimiter,
  [
    body("targetType").isIn(["drill", "contribution", "tactic"]),
    body("targetId").isMongoId(),
    body("reason").trim().notEmpty().isLength({ max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      // Prevent duplicate reports
      const existing = await Report.findOne({
        targetType: req.body.targetType,
        targetId: String(req.body.targetId),
        reportedBy: req.user._id,
        status: "pending",
      });
      if (existing) {
        return res.status(400).json({ error: "You have already reported this" });
      }

      const report = await Report.create({
        targetType: req.body.targetType,
        targetId: String(req.body.targetId),
        reason: req.body.reason,
        reportedBy: req.user._id,
      });

      await logAudit("report.create", {
        userId: req.user._id,
        ip: req.ip,
        targetType: req.body.targetType,
        targetId: report._id,
        details: { reason: req.body.reason.slice(0, 200) },
      });

      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reports — list reports (system admin only)
router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    const reports = await Report.find(filter)
      .populate("reportedBy", "name email")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// PUT /api/reports/:id — resolve a report (system admin only)
router.put(
  "/:id",
  [
    body("status").isIn(["reviewed", "resolved", "dismissed"]),
    body("resolution").optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const report = await Report.findById(req.params.id);
      if (!report) return res.status(404).json({ error: "Report not found" });

      report.status = req.body.status;
      report.resolution = req.body.resolution || "";
      report.resolvedBy = req.user._id;
      await report.save();

      await logAudit("report.resolve", {
        userId: req.user._id,
        ip: req.ip,
        targetType: "report",
        targetId: report._id,
        details: { status: report.status, resolution: report.resolution.slice(0, 200) },
      });

      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
