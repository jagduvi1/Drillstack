const router = require("express").Router();
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/superAdmin");
const { getAISettings, updateAISetting, DEFAULTS } = require("../config/aiConfig");
const SiteConfig = require("../models/SiteConfig");
const AuditLog = require("../models/AuditLog");
const { logAudit } = require("../models/AuditLog");
const User = require("../models/User");
const Drill = require("../models/Drill");
const TrainingSession = require("../models/TrainingSession");
const PeriodPlan = require("../models/PeriodPlan");
const { superadminLimiter } = require("../utils/rateLimiters");

router.use(superadminLimiter);

// All routes require auth + super admin
router.use(authenticate, requireSuperAdmin);

// ── Overview ─────────────────────────────────────────────────────────────────

router.get("/overview", async (_req, res, next) => {
  try {
    const [userCount, drillCount, sessionCount, planCount] = await Promise.all([
      User.countDocuments(),
      Drill.countDocuments(),
      TrainingSession.countDocuments(),
      PeriodPlan.countDocuments(),
    ]);

    // Role breakdown
    const roles = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    // Plan breakdown
    const planBreakdown = await User.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    // Registrations over last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const registrationsOverTime = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Recent users
    const recentUsers = await User.find()
      .select("name email plan role createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      counts: { totalUsers: userCount, totalDrills: drillCount, totalSessions: sessionCount, totalPlans: planCount },
      roles: Object.fromEntries(roles.map((r) => [r._id || "user", r.count])),
      byPlan: Object.fromEntries(planBreakdown.map((p) => [p._id || "starter", p.count])),
      registrationsOverTime,
      recentUsers,
    });
  } catch (err) {
    next(err);
  }
});

// ── Services health ──────────────────────────────────────────────────────────

router.get("/services", async (_req, res) => {
  const checks = {};

  // MongoDB
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    checks.mongodb = { status: "ok", latency: Date.now() - start };
  } catch {
    checks.mongodb = { status: "error" };
  }

  // Qdrant
  try {
    const start = Date.now();
    const r = await fetch(`${process.env.QDRANT_URL || "http://qdrant:6333"}/healthz`);
    checks.qdrant = { status: r.ok ? "ok" : "error", latency: Date.now() - start };
  } catch {
    checks.qdrant = { status: "error" };
  }

  // Meilisearch
  if (process.env.ENABLE_MEILISEARCH === "true") {
    try {
      const start = Date.now();
      const r = await fetch(`${process.env.MEILI_URL || "http://meilisearch:7700"}/health`);
      checks.meilisearch = { status: r.ok ? "ok" : "error", latency: Date.now() - start };
    } catch {
      checks.meilisearch = { status: "error" };
    }
  }

  // Voyage AI
  if (process.env.VOYAGE_API_KEY) {
    checks.voyage = { status: "configured" };
  } else {
    checks.voyage = { status: "not_configured" };
  }

  // AI provider
  if (process.env.AI_API_KEY) {
    checks.ai = { status: "configured" };
  } else {
    checks.ai = { status: "not_configured" };
  }

  res.json(checks);
});

// ── Process stats ───────────────────────────────────────────────────────────

router.get("/process", (_req, res) => {
  const mem = process.memoryUsage();
  const uptimeS = Math.floor(process.uptime());
  const d = Math.floor(uptimeS / 86400);
  const h = Math.floor((uptimeS % 86400) / 3600);
  const m = Math.floor((uptimeS % 3600) / 60);
  const s = uptimeS % 60;
  const uptimeFormatted = `${d}d ${h}h ${m}m ${s}s`;

  res.json({
    nodeVersion: process.version,
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: uptimeS,
    uptimeFormatted,
    memory: {
      rssBytes: mem.rss,
      heapTotalBytes: mem.heapTotal,
      heapUsedBytes: mem.heapUsed,
      externalBytes: mem.external,
      heapUsedPct: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    },
    env: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || "4000",
    },
  });
});

// ── Database stats (MongoDB) ────────────────────────────────────────────────

router.get("/database", async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const dbStats = await db.stats();
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    for (const col of collections) {
      const s = await db.collection(col.name).stats();
      collectionStats.push({
        name: col.name,
        count: s.count,
        size: s.size,
        storageSize: s.storageSize || 0,
        avgObjSize: s.avgObjSize || 0,
        nindexes: s.nindexes,
        totalIndexSize: s.totalIndexSize || 0,
      });
    }
    collectionStats.sort((a, b) => b.count - a.count);

    res.json({
      database: dbStats.db,
      collections: dbStats.collections,
      objects: dbStats.objects,
      dataSize: dbStats.dataSize,
      storageSize: dbStats.storageSize,
      indexSize: dbStats.indexSize,
      avgObjSize: dbStats.avgObjSize || 0,
      collectionStats,
    });
  } catch (err) {
    next(err);
  }
});

// ── AI settings ──────────────────────────────────────────────────────────────

router.get("/ai", async (_req, res, next) => {
  try {
    const settings = await getAISettings();
    res.json({ settings, defaults: DEFAULTS });
  } catch (err) {
    next(err);
  }
});

router.put("/ai/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: "Value is required" });
    }
    if (!Object.keys(DEFAULTS).includes(key)) {
      return res.status(400).json({ error: `Unknown AI setting: ${key}` });
    }

    await updateAISetting(key, value, req.user._id);
    logAudit("superadmin.ai.update", {
      userId: req.user._id,
      email: req.user.email,
      details: { key, value },
    });

    const settings = await getAISettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// Reset a setting to default
router.delete("/ai/:key", async (req, res, next) => {
  try {
    await SiteConfig.deleteOne({ key: req.params.key });
    const { invalidateCache } = require("../config/aiConfig");
    invalidateCache();

    logAudit("superadmin.ai.reset", {
      userId: req.user._id,
      email: req.user.email,
      details: { key: req.params.key },
    });

    const settings = await getAISettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// ── Users ────────────────────────────────────────────────────────────────────

router.get("/users", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search && typeof req.query.search === "string") {
      const searchTerm = req.query.search.slice(0, 200);
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/superadmin/users/:id/plan — update a user's plan or grant a trial
router.put("/users/:id/plan", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { plan, grantTrial, trialDays } = req.body;

    if (grantTrial) {
      const days = parseInt(trialDays, 10) || 30;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + days);
      user.trialPlan = "pro";
      user.trialEndsAt = endsAt;
      user.trialUsed = true;
      await user.save();
      logAudit("superadmin.user.grantTrial", {
        userId: req.user._id,
        email: req.user.email,
        details: { targetUserId: user._id, trialDays: days },
      });
      return res.json({ message: `Granted ${days}-day trial to ${user.email}` });
    }

    if (plan) {
      user.plan = plan;
      await user.save();
      logAudit("superadmin.user.updatePlan", {
        userId: req.user._id,
        email: req.user.email,
        details: { targetUserId: user._id, plan },
      });
      return res.json({ message: `Updated ${user.email} to ${plan} plan` });
    }

    res.status(400).json({ error: "No update specified" });
  } catch (err) {
    next(err);
  }
});

// ── Audit log ────────────────────────────────────────────────────────────────

router.get("/audit", async (req, res, next) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email");
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── Ad Board Configuration ──────────────────────────────────────────────────

// GET /api/superadmin/ad-boards — get current ad config
router.get("/ad-boards", async (req, res, next) => {
  try {
    const ads = await SiteConfig.getValue("adBoards", []);
    res.json(ads);
  } catch (err) {
    next(err);
  }
});

// PUT /api/superadmin/ad-boards — save ad config
router.put("/ad-boards", async (req, res, next) => {
  try {
    const ads = (req.body.ads || []).slice(0, 30).map((ad) => ({
      text: String(ad.text || "").slice(0, 50),
      bgColor: String(ad.bgColor || "#6366f1").slice(0, 20),
      textColor: String(ad.textColor || "#ffffff").slice(0, 20),
      position: ad.position || "side", // "side" or "goal"
    }));
    await SiteConfig.setValue("adBoards", ads, req.user._id, "3D pitch advertisement boards");
    logAudit("superadmin.adBoards.update", { userId: req.user._id, email: req.user.email });
    res.json(ads);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
