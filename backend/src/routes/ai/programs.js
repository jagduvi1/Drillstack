const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const PeriodPlan = require("../../models/PeriodPlan");
const aiService = require("../../services/ai");
const { indexPlan } = require("../../services/sync");
const { sanitizeDebug, sanitizeAiInput } = require("./utils");

// POST /api/ai/generate-program — generate a training program from description
router.post(
  "/generate-program",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 }), body("sessionsPerWeek").optional().isInt({ min: 1, max: 14 })],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, sessionsPerWeek, weeks, startDate, endDate } =
        req.body;
      const { program: generated, debug } = await aiService.generateTrainingProgram({
        description,
        sport,
        sessionsPerWeek,
        weeks,
        startDate,
        endDate,
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
    body("sessionsPerWeek").optional().isInt({ min: 1, max: 14 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, sessionsPerWeek, startDate, endDate } =
        req.body;

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }
      const weeks = Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));

      const { program: generated, debug } = await aiService.generateTrainingProgram({
        description,
        sport,
        sessionsPerWeek,
        weeks,
        startDate,
        endDate,
      });

      const plan = await PeriodPlan.create({
        title: generated.title || "Training Program",
        description: generated.description || description,
        sport: generated.sport || sport || null,
        startDate,
        endDate,
        sessionsPerWeek: sessionsPerWeek || 3,
        goals: generated.goals || [],
        focusAreas: generated.focusAreas || [],
        weeklyPlans: generated.weeklyPlans || [],
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
      const plan = await PeriodPlan.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      plan.aiConversation.push({
        role: "user",
        content: sanitizeAiInput(req.body.message),
      });

      const currentProgram = {
        title: plan.title,
        description: plan.description,
        sport: plan.sport,
        goals: plan.goals,
        focusAreas: plan.focusAreas,
        weeklyPlans: plan.weeklyPlans.map((w) => ({
          week: w.week,
          theme: w.theme,
          sessions: w.sessions.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            title: s.title,
            focus: s.focus,
            intensity: s.intensity,
            durationMinutes: s.durationMinutes,
            notes: s.notes,
          })),
          notes: w.notes,
        })),
      };

      const recentMessages = plan.aiConversation
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10);

      const result = await aiService.refineTrainingProgram(
        currentProgram,
        recentMessages
      );

      if (result.program) {
        plan.title = result.program.title || plan.title;
        plan.description = result.program.description || plan.description;
        plan.sport = result.program.sport || plan.sport;
        plan.goals = result.program.goals || plan.goals;
        plan.focusAreas = result.program.focusAreas || plan.focusAreas;
        if (result.program.weeklyPlans) {
          plan.weeklyPlans = result.program.weeklyPlans;
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
