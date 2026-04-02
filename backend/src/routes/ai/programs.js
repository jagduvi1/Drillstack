const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const Plan = require("../../models/Plan");
const aiService = require("../../services/ai");
const { indexPlan } = require("../../services/sync");
const { sanitizeDebug, sanitizeAiInput } = require("./utils");

// POST /api/ai/generate-program — generate a training program from description
router.post(
  "/generate-program",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 })],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, startDate, endDate } = req.body;
      const { program: generated, debug } = await aiService.generateTrainingProgram({
        description,
        sport,
        startDate,
        endDate,
        userSport: req.user.preferredSport,
      });
      res.json({ program: generated, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-and-save-program — generate and persist a program
router.post(
  "/generate-and-save-program",
  authenticate,
  checkAiLimit,
  [
    body("description").trim().notEmpty().isLength({ max: 5000 }),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, startDate, endDate } = req.body;

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      const { program: generated, debug } = await aiService.generateTrainingProgram({
        description,
        sport,
        startDate,
        endDate,
        userSport: req.user.preferredSport,
      });

      const plan = await Plan.create({
        name: generated.name || generated.title || "Training Program",
        sport: generated.sport || sport || null,
        startDate,
        endDate,
        objective: generated.objective || generated.description || description,
        phases: generated.phases || [],
        aiConversation: [
          { role: "user", content: description },
          { role: "assistant", content: "Training program generated successfully." },
        ],
        createdBy: req.user._id,
      });

      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.status(201).json({ ...plan.toObject(), debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine-program/:id — refine a program via chat
router.post(
  "/refine-program/:id",
  authenticate,
  checkAiLimit,
  [body("message").trim().notEmpty().isLength({ max: 2000 })],
  validate,
  async (req, res, next) => {
    try {
      const plan = await Plan.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      plan.aiConversation.push({
        role: "user",
        content: sanitizeAiInput(req.body.message),
      });

      const currentProgram = {
        name: plan.name,
        objective: plan.objective,
        sport: plan.sport,
        phases: plan.phases.map((p) => ({
          name: p.name,
          primaryFocus: p.primaryFocus,
          secondaryFocus: p.secondaryFocus,
          description: p.description,
          order: p.order,
        })),
      };

      const recentMessages = plan.aiConversation
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10);

      const result = await aiService.refineTrainingProgram(
        currentProgram,
        recentMessages,
        { userSport: req.user.preferredSport }
      );

      if (result.program) {
        plan.name = result.program.name || result.program.title || plan.name;
        plan.objective = result.program.objective || result.program.description || plan.objective;
        plan.sport = result.program.sport || plan.sport;
        if (result.program.phases) {
          plan.phases = result.program.phases;
        }
        plan.aiConversation.push({
          role: "assistant",
          content: "Program updated based on your feedback.",
        });
      } else {
        plan.aiConversation.push({
          role: "assistant",
          content: result.message,
        });
      }

      await plan.save();
      indexPlan(plan).catch((e) => console.error("Index error:", e.message));
      res.json({ ...plan.toObject(), debug: sanitizeDebug(result.debug) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
