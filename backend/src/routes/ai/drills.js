const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const Drill = require("../../models/Drill");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const aiService = require("../../services/ai");
const { indexDrill } = require("../../services/sync");
const { createDrillSnapshot } = require("../../utils/drillSnapshot");
const { sanitizeDebug, sanitizeAiInput } = require("./utils");

// POST /api/ai/generate — generate a complete drill from a description
router.post(
  "/generate",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 }), body("sport").optional().trim().isLength({ max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport } = req.body;
      const { drill: generated, debug } = await aiService.generateDrill(description, sport);
      res.json({ drill: generated, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-and-save — generate and persist a drill
router.post(
  "/generate-and-save",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 }), body("sport").optional().trim().isLength({ max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport } = req.body;
      const { drill: generated, debug } = await aiService.generateDrill(description, sport);

      const drill = await Drill.create({
        ...generated,
        aiConversation: [
          { role: "user", content: description },
          { role: "assistant", content: "Drill generated successfully." },
        ],
        createdBy: req.user._id,
      });

      indexDrill(drill).catch((e) => console.error("Index error:", e.message));
      res.status(201).json({ ...drill.toObject(), debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine/:id — refine an existing drill via chat
router.post(
  "/refine/:id",
  authenticate,
  checkAiLimit,
  [body("message").trim().notEmpty().isLength({ max: 2000 })],
  validate,
  async (req, res, next) => {
    try {
      const drill = await Drill.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!drill) return res.status(404).json({ error: "Drill not found" });

      // Add user message to conversation (sanitized)
      drill.aiConversation.push({
        role: "user",
        content: sanitizeAiInput(req.body.message),
      });

      // Build current drill state for AI
      const currentDrill = {
        title: drill.title,
        description: drill.description,
        sport: drill.sport,
        intensity: drill.intensity,
        setup: drill.setup,
        howItWorks: drill.howItWorks,
        coachingPoints: drill.coachingPoints,
        variations: drill.variations,
        commonMistakes: drill.commonMistakes,
      };

      const recentMessages = drill.aiConversation
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10);

      const result = await aiService.refineDrill(currentDrill, recentMessages);

      if (result.drill) {
        // Snapshot & notify starred users BEFORE applying changes
        const starredUsers = await User.find({
          starredDrills: drill._id,
          _id: { $ne: req.user._id },
        }).select("_id");

        if (starredUsers.length > 0) {
          const snapshot = createDrillSnapshot(drill);
          Notification.insertMany(
            starredUsers.map((u) => ({
              userId: u._id,
              type: "drill_changed",
              drillId: drill._id,
              message: `"${drill.title}" was updated by its owner. You can create your own version from the previous state.`,
              snapshot,
            }))
          ).catch((e) => console.error("Notification insert error:", e.message));
        }

        Object.assign(drill, {
          title: result.drill.title || drill.title,
          description: result.drill.description || drill.description,
          sport: result.drill.sport || drill.sport,
          intensity: result.drill.intensity || drill.intensity,
          setup: result.drill.setup || drill.setup,
          howItWorks: result.drill.howItWorks || drill.howItWorks,
          coachingPoints: result.drill.coachingPoints || drill.coachingPoints,
          variations: result.drill.variations || drill.variations,
          commonMistakes: result.drill.commonMistakes || drill.commonMistakes,
        });

        drill.aiConversation.push({
          role: "assistant",
          content: "Drill updated based on your feedback.",
        });
      } else {
        drill.aiConversation.push({
          role: "assistant",
          content: result.message,
        });
      }

      await drill.save();
      indexDrill(drill).catch((e) => console.error("Index error:", e.message));
      res.json({ ...drill.toObject(), debug: sanitizeDebug(result.debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/summarize
router.post(
  "/summarize",
  authenticate,
  checkAiLimit,
  [body("drill").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { summary, debug } = await aiService.summarizeDrill(req.body.drill);
      res.json({ summary, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
