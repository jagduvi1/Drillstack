const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../middleware/auth");
const Notification = require("../models/Notification");
const Drill = require("../models/Drill");
const User = require("../models/User");
const { indexDrill } = require("../services/sync");
const { standardLimiter } = require("../utils/rateLimiters");

router.use(standardLimiter);

// GET /api/notifications — list notifications for current user
router.get("/", authenticate, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate("drillId", "title")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count — quick badge count
router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put("/:id/read", authenticate, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/:id/fork-snapshot — create a version from the snapshot
const forkSnapshotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
// This also: 1) auto-stars the new version for ALL users who had the same notification
//            2) removes all notifications for that drill (since the old version now exists again)
router.post("/:id/fork-snapshot", authenticate, forkSnapshotLimiter, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (!notification.snapshot) return res.status(400).json({ error: "No snapshot available" });

    const originalDrill = await Drill.findById(notification.drillId);
    if (!originalDrill) return res.status(404).json({ error: "Original drill no longer exists" });

    // Determine root and version number
    const rootId = originalDrill.parentDrill || originalDrill._id;
    const versionCount = await Drill.countDocuments({
      $or: [{ _id: rootId }, { parentDrill: rootId }],
    });

    // Create a new version from the snapshot
    const snap = notification.snapshot;
    const fork = await Drill.create({
      title: snap.title,
      description: snap.description,
      sport: snap.sport,
      intensity: snap.intensity,
      setup: snap.setup || {},
      howItWorks: snap.howItWorks,
      coachingPoints: snap.coachingPoints || [],
      variations: snap.variations || [],
      commonMistakes: snap.commonMistakes || [],
      diagrams: snap.diagrams || [],
      parentDrill: rootId,
      version: versionCount + 1,
      versionName: "Pre-change version",
      forkedBy: req.user._id,
      createdBy: req.user._id,
      aiConversation: [],
    });

    // Index the new drill
    indexDrill(fork).catch((e) => console.error("Index error:", e.message));

    // Find ALL users who have a notification for this same drill change
    const affectedNotifications = await Notification.find({
      drillId: notification.drillId,
      type: "drill_changed",
      // Match by snapshot title to group related notifications
      "snapshot.title": snap.title,
    });

    const affectedUserIds = affectedNotifications.map((n) => n.userId);

    // Auto-star the new version for all affected users
    if (affectedUserIds.length > 0) {
      await User.updateMany(
        { _id: { $in: affectedUserIds } },
        { $addToSet: { starredDrills: fork._id } }
      );
    }

    // Remove all notifications for this drill (the old version now exists as a fork)
    await Notification.deleteMany({
      drillId: notification.drillId,
      type: "drill_changed",
    });

    res.status(201).json(fork);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — dismiss a notification
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
