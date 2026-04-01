const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const Drill = require("../../models/Drill");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const aiService = require("../../services/ai");
const { generateDiagram } = require("../../services/imageGen");
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
        // Save only the conversation history — the refined fields are returned
        // as a preview for the frontend. The user must explicitly save.
        drill.aiConversation.push({
          role: "assistant",
          content: "Drill refined. Review the changes and save when ready.",
        });
        await drill.save();

        // Return the refined fields as a preview (not persisted yet)
        const refined = {
          title: result.drill.title || drill.title,
          description: result.drill.description || drill.description,
          sport: result.drill.sport || drill.sport,
          intensity: result.drill.intensity || drill.intensity,
          setup: result.drill.setup || drill.setup,
          howItWorks: result.drill.howItWorks || drill.howItWorks,
          coachingPoints: result.drill.coachingPoints || drill.coachingPoints,
          variations: result.drill.variations || drill.variations,
          commonMistakes: result.drill.commonMistakes || drill.commonMistakes,
        };

        res.json({
          ...drill.toObject(),
          refinedFields: refined,
          debug: sanitizeDebug(result.debug),
        });
      } else {
        drill.aiConversation.push({
          role: "assistant",
          content: result.message,
        });
        await drill.save();

        res.json({ ...drill.toObject(), debug: sanitizeDebug(result.debug) });
      }
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

// POST /api/ai/refine-draft — refine a draft drill (not yet saved) via chat
router.post(
  "/refine-draft",
  authenticate,
  checkAiLimit,
  [
    body("message").trim().notEmpty().isLength({ max: 2000 }),
    body("drill").notEmpty(),
    body("conversationHistory").optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { message, drill: currentDrill, conversationHistory = [] } = req.body;

      const messages = [
        ...conversationHistory.slice(-10),
        { role: "user", content: sanitizeAiInput(message) },
      ];

      const result = await aiService.refineDrill(currentDrill, messages);

      const updatedHistory = [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: result.drill ? "Drill refined." : (result.message || "No changes.") },
      ];

      res.json({
        refinedFields: result.drill || null,
        message: result.message || null,
        conversationHistory: updatedHistory,
        debug: sanitizeDebug(result.debug),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-diagram/:id — generate a tactical diagram for a drill
router.post(
  "/generate-diagram/:id",
  authenticate,
  checkAiLimit,
  async (req, res, next) => {
    try {
      const drill = await Drill.findById(req.params.id);
      if (!drill) return res.status(404).json({ error: "Drill not found" });
      if (drill.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorized to generate diagrams for this drill" });
      }

      const { path: diagramPath, debug } = await generateDiagram(drill);

      drill.diagrams.push(diagramPath);
      await drill.save();

      res.json({ diagram: diagramPath, drill, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
