const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const Drill = require("../../models/Drill");
const aiService = require("../../services/ai");
const { generateDiagram } = require("../../services/imageGen");
const { sanitizeDebug } = require("./utils");

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

// POST /api/ai/generate-tactic-animation — generate tactic board animation from drill description
router.post(
  "/generate-tactic-animation",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 })],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, fieldType, numHomePlayers, numAwayPlayers, homeFormation, awayFormation } = req.body;
      const { animation, error, debug } = await aiService.generateTacticAnimation(description, {
        sport, fieldType, numHomePlayers, numAwayPlayers, homeFormation, awayFormation,
      });
      if (error) return res.status(422).json({ error, debug: sanitizeDebug(debug) });
      res.json({ animation, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine-tactic-animation — refine an existing tactic board via chat
router.post(
  "/refine-tactic-animation",
  authenticate,
  checkAiLimit,
  [body("message").trim().notEmpty().isLength({ max: 2000 }), body("steps").isArray({ min: 1, max: 50 })],
  validate,
  async (req, res, next) => {
    try {
      const { steps, message, conversationHistory = [], sport = "football" } = req.body;
      const history = [...conversationHistory, { role: "user", content: message }];
      const { steps: updatedSteps, message: aiMessage, debug } = await aiService.refineTacticAnimation(steps, history, sport);
      res.json({ steps: updatedSteps, message: aiMessage, conversationHistory: history, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
