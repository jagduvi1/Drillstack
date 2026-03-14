const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const Drill = require("../models/Drill");
const PeriodPlan = require("../models/PeriodPlan");
const aiService = require("../services/ai");
const { indexDrill, indexPlan } = require("../services/sync");
const { generateDiagram } = require("../services/imageGen");

// POST /api/ai/generate — generate a complete drill from a description
router.post(
  "/generate",
  authenticate,
  [body("description").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport } = req.body;
      const generated = await aiService.generateDrill(description, sport);
      res.json({ drill: generated });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-and-save — generate and persist a drill
router.post(
  "/generate-and-save",
  authenticate,
  [body("description").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport } = req.body;
      const generated = await aiService.generateDrill(description, sport);

      const drill = await Drill.create({
        ...generated,
        aiConversation: [
          { role: "user", content: description },
          { role: "assistant", content: "Drill generated successfully." },
        ],
        createdBy: req.user._id,
      });

      indexDrill(drill).catch((e) => console.error("Index error:", e.message));
      res.status(201).json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine/:id — refine an existing drill via chat
router.post(
  "/refine/:id",
  authenticate,
  [body("message").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const drill = await Drill.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!drill) return res.status(404).json({ error: "Drill not found" });

      // Add user message to conversation
      drill.aiConversation.push({
        role: "user",
        content: req.body.message,
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
      res.json(drill);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/suggest-session — suggest a session plan
// Uses starred drills by default, or all drills if ?useAll=true
router.post(
  "/suggest-session",
  authenticate,
  [body("description").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const User = require("../models/User");
      let drillFilter = {};

      if (!req.body.useAll) {
        // Default: use only starred drills
        const user = await User.findById(req.user._id).select("starredDrills");
        if (user?.starredDrills?.length > 0) {
          drillFilter._id = { $in: user.starredDrills };
        }
        // If no starred drills, fall back to all drills
      }

      const drills = await Drill.find(drillFilter)
        .select("title description intensity setup sport")
        .limit(50)
        .sort({ updatedAt: -1 });

      const suggestion = await aiService.generateSessionPlan(
        req.body.description,
        drills
      );
      res.json({ suggestion, availableDrills: drills, usedStarred: !req.body.useAll });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/summarize
router.post(
  "/summarize",
  authenticate,
  [body("drill").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const summary = await aiService.summarizeDrill(req.body.drill);
      res.json({ summary });
    } catch (err) {
      next(err);
    }
  }
);

// ── Training Program AI ──────────────────────────────────────────────────────

// POST /api/ai/generate-program — generate a training program from description
router.post(
  "/generate-program",
  authenticate,
  [body("description").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, sessionsPerWeek, weeks, startDate, endDate } =
        req.body;
      const generated = await aiService.generateTrainingProgram({
        description,
        sport,
        sessionsPerWeek,
        weeks,
        startDate,
        endDate,
      });
      res.json({ program: generated });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-and-save-program — generate and persist a program
router.post(
  "/generate-and-save-program",
  authenticate,
  [
    body("description").trim().notEmpty(),
    body("startDate").isISO8601(),
    body("endDate").isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { description, sport, sessionsPerWeek, startDate, endDate } =
        req.body;

      // Calculate weeks from dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const weeks = Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));

      const generated = await aiService.generateTrainingProgram({
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
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine-program/:id — refine a program via chat
router.post(
  "/refine-program/:id",
  authenticate,
  [body("message").trim().notEmpty()],
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
        content: req.body.message,
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
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/adapt-session — adapt a planned session to real-world constraints
router.post(
  "/adapt-session",
  authenticate,
  [body("session").notEmpty(), body("constraints").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { session, constraints } = req.body;
      const adapted = await aiService.adaptSession(session, constraints);
      res.json({ adapted });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/generate-diagram/:id — generate a tactical diagram for a drill
router.post(
  "/generate-diagram/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const drill = await Drill.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!drill) return res.status(404).json({ error: "Drill not found" });

      const diagramPath = await generateDiagram(drill);

      drill.diagrams.push(diagramPath);
      await drill.save();

      res.json({ diagram: diagramPath, drill });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
