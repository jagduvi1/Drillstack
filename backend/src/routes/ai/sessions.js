const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { checkAiLimit } = require("../../middleware/planLimits");
const Drill = require("../../models/Drill");
const User = require("../../models/User");
const aiService = require("../../services/ai");
const { sanitizeDebug, sanitizeAiInput, escapeRegex } = require("./utils");

// POST /api/ai/suggest-session — suggest a session plan
// Uses semantic search to find relevant drills, starred matches prioritized
router.post(
  "/suggest-session",
  authenticate,
  checkAiLimit,
  [body("description").trim().notEmpty().isLength({ max: 5000 }), body("sport").optional().trim().isLength({ max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const { semanticSearch } = require("../../services/search");

      // 1. Get the user's starred drill IDs for prioritization
      const user = await User.findById(req.user._id).select("starredDrills");
      const starredIdSet = new Set((user?.starredDrills || []).map((id) => id.toString()));

      // 2. Use semantic search to find drills relevant to the session description
      let matchedDrills = [];
      try {
        const sport = req.body.sport || undefined;
        const hits = await semanticSearch(req.body.description, {
          limit: 30,
          sport: sport || null,
          type: "drill",
        });
        const semanticIds = hits.map((h) => h.id).filter(Boolean);
        if (semanticIds.length > 0) {
          matchedDrills = await Drill.find({ _id: { $in: semanticIds } })
            .select("title description intensity setup sport")
            .lean();
        }
      } catch (searchErr) {
        // If semantic search fails (Qdrant down, no embeddings), fall back to recent drills
        console.error("Semantic search failed, falling back:", searchErr.message);
        matchedDrills = await Drill.find()
          .select("title description intensity setup sport")
          .limit(30)
          .sort({ updatedAt: -1 })
          .lean();
      }

      // 3. Sort: starred drills first, then the rest
      const drills = matchedDrills.sort((a, b) => {
        const aStarred = starredIdSet.has(a._id.toString()) ? 1 : 0;
        const bStarred = starredIdSet.has(b._id.toString()) ? 1 : 0;
        return bStarred - aStarred;
      });

      const starredCount = drills.filter((d) => starredIdSet.has(d._id.toString())).length;

      const result = await aiService.generateSessionPlan(
        req.body.description,
        drills,
        { numPlayers: req.body.numPlayers, totalMinutes: req.body.totalMinutes, starredIds: [...starredIdSet] }
      );

      // Post-process: strip out any drill references that don't match existing drills
      const drillTitleSet = new Set(drills.map((d) => d.title.toLowerCase()));
      const unmatchedDrills = [];
      if (result.plan?.blocks) {
        for (const block of result.plan.blocks) {
          if (block.type === "drills" && block.drillTitles) {
            const validIndices = [];
            block.drillTitles = block.drillTitles.filter((title, idx) => {
              const valid = drillTitleSet.has(title.toLowerCase());
              if (valid) validIndices.push(idx);
              else unmatchedDrills.push(title);
              return valid;
            });
            if (block.durations) {
              block.durations = validIndices.map((idx) => block.durations[idx]);
            }
          }
          if (block.type === "stations" && block.stationDrills) {
            block.stationDrills = block.stationDrills.filter(
              (sd) => drillTitleSet.has((sd.drillTitle || "").toLowerCase())
            );
            block.stationCount = block.stationDrills.length;
          }
        }
        // Remove drill/station blocks that ended up empty
        result.plan.blocks = result.plan.blocks.filter((block) => {
          if (block.type === "drills" && (!block.drillTitles || block.drillTitles.length === 0)) return false;
          if (block.type === "stations" && (!block.stationDrills || block.stationDrills.length === 0)) return false;
          return true;
        });
      }

      res.json({
        suggestion: result.plan,
        availableDrills: drills,
        starredCount,
        semanticCount: drills.length,
        ...(unmatchedDrills.length > 0 && { unmatchedDrills }),
        debug: sanitizeDebug(result.debug),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/refine-session/:id — refine a session via AI chat
router.post(
  "/refine-session/:id",
  authenticate,
  checkAiLimit,
  [body("message").trim().notEmpty().isLength({ max: 2000 })],
  validate,
  async (req, res, next) => {
    try {
      const TrainingSession = require("../../models/TrainingSession");
      const session = await TrainingSession.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      })
        .populate("blocks.drills.drill", "title description setup")
        .populate("blocks.stations.drill", "title description setup");
      if (!session) return res.status(404).json({ error: "Session not found" });

      session.aiConversation.push({
        role: "user",
        content: sanitizeAiInput(req.body.message),
      });

      // Build current session state for AI
      const currentSession = {
        title: session.title,
        description: session.description,
        sport: session.sport,
        expectedPlayers: session.expectedPlayers,
        expectedTrainers: session.expectedTrainers,
        blocks: (session.blocks || []).map((b) => {
          const base = {
            type: b.type,
            label: b.label || b.type,
            notes: b.notes || "",
          };
          if (b.type === "drills") {
            base.drills = (b.drills || []).map((d) => ({
              drillTitle: d.drill?.title || "Unknown",
              duration: d.duration,
              notes: d.notes || "",
            }));
          }
          if (b.type === "stations") {
            base.stationCount = b.stationCount;
            base.rotationMinutes = b.rotationMinutes;
            base.stationDrills = (b.stations || []).map((s) => ({
              stationNumber: s.stationNumber,
              drillTitle: s.drill?.title || "Unset",
            }));
          }
          if (b.type === "matchplay") {
            base.duration = b.duration;
            base.matchDescription = b.matchDescription;
            base.rules = b.rules;
          }
          if (b.type === "break") base.duration = b.duration;
          if (b.type === "custom") {
            base.duration = b.duration;
            base.customContent = b.customContent;
          }
          return base;
        }),
      };

      const recentMessages = session.aiConversation
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10);

      // Use semantic search to find relevant drills instead of loading all
      const { semanticSearch } = require("../../services/search");

      // Build search context from session + user message
      const searchContext = `${session.title} ${session.description || ""} ${session.sport || ""} ${req.body.message}`;

      // Drills already in the session must always be available
      const sessionDrillTitles = [];
      for (const b of session.blocks || []) {
        for (const d of b.drills || []) if (d.drill?.title) sessionDrillTitles.push(d.drill.title);
        for (const s of b.stations || []) if (s.drill?.title) sessionDrillTitles.push(s.drill.title);
      }

      // Semantic search for relevant drills
      let semanticTitles = [];
      try {
        const hits = await semanticSearch(searchContext, { limit: 20, type: "drill" });
        const ids = hits.map((h) => h.id).filter(Boolean);
        if (ids.length > 0) {
          const matched = await Drill.find({ _id: { $in: ids } }).select("title").lean();
          semanticTitles = matched.map((d) => d.title);
        }
      } catch (e) {
        // Fallback if semantic search fails
        const fallback = await Drill.find().select("title").limit(30).sort({ updatedAt: -1 }).lean();
        semanticTitles = fallback.map((d) => d.title);
      }

      // Merge: session drills + semantic matches, deduplicated
      const titleSet = new Set([...sessionDrillTitles, ...semanticTitles]);
      const availableDrillTitles = [...titleSet];

      const result = await aiService.refineSession(currentSession, recentMessages, availableDrillTitles);

      if (result.session) {
        // AI returned updated block structure — update labels/notes/durations/descriptions
        // but keep drill ObjectId references intact (AI uses titles, not IDs)
        if (result.session.title) session.title = result.session.title;
        if (result.session.description) session.description = result.session.description;

        if (result.session.blocks) {
          // Map AI block output back to DB blocks by index where possible
          const newBlocks = [];

          for (let i = 0; i < result.session.blocks.length; i++) {
            const ab = result.session.blocks[i];
            const block = {
              type: ab.type,
              label: ab.label || ab.type,
              order: i,
              notes: ab.notes || "",
            };

            if (ab.type === "drills" && ab.drills) {
              block.drills = [];
              for (const d of ab.drills) {
                const match = await Drill.findOne({
                  title: { $regex: new RegExp(`^${escapeRegex(d.drillTitle)}$`, "i") },
                }).select("_id");
                block.drills.push({
                  drill: match?._id || null,
                  duration: d.duration || 10,
                  notes: d.notes || "",
                });
              }
              // Remove entries where drill couldn't be resolved
              block.drills = block.drills.filter((d) => d.drill);
            }

            if (ab.type === "stations") {
              block.stationCount = ab.stationCount || 0;
              block.rotationMinutes = ab.rotationMinutes || 5;
              block.stations = [];
              for (const sd of ab.stationDrills || []) {
                const match = await Drill.findOne({
                  title: { $regex: new RegExp(`^${escapeRegex(sd.drillTitle)}$`, "i") },
                }).select("_id");
                block.stations.push({
                  stationNumber: sd.stationNumber,
                  drill: match?._id || null,
                  notes: "",
                });
              }
            }

            if (ab.type === "matchplay") {
              block.duration = ab.duration || 15;
              block.matchDescription = ab.matchDescription || "";
              block.rules = ab.rules || "";
            }

            if (ab.type === "break") {
              block.duration = ab.duration || 3;
            }

            if (ab.type === "custom") {
              block.duration = ab.duration || 5;
              block.customContent = ab.customContent || "";
            }

            newBlocks.push(block);
          }

          session.blocks = newBlocks;
        }

        session.aiConversation.push({
          role: "assistant",
          content: "Session updated based on your feedback.",
        });
      } else {
        session.aiConversation.push({
          role: "assistant",
          content: result.message,
        });
      }

      await session.save();
      // Re-populate for the response
      await session.populate("blocks.drills.drill", "title intensity setup sport");
      await session.populate("blocks.stations.drill", "title intensity setup sport");
      res.json({ session, debug: sanitizeDebug(result.debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/adapt-session — adapt a planned session to real-world constraints
router.post(
  "/adapt-session",
  authenticate,
  checkAiLimit,
  [body("session").notEmpty(), body("constraints").trim().notEmpty().isLength({ max: 2000 })],
  validate,
  async (req, res, next) => {
    try {
      const { session, constraints } = req.body;
      const result = await aiService.adaptSession(session, constraints);
      res.json({ adapted: result.adapted, debug: sanitizeDebug(result.debug) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/check-session-feasibility/:id — check if session works with actual attendance
router.post(
  "/check-session-feasibility/:id",
  authenticate,
  [body("actualPlayers").isInt({ min: 0 }), body("actualTrainers").isInt({ min: 0 })],
  validate,
  async (req, res, next) => {
    try {
      const TrainingSession = require("../../models/TrainingSession");
      const session = await TrainingSession.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      })
        .populate("blocks.drills.drill", "title description setup")
        .populate("blocks.stations.drill", "title description setup");
      if (!session) return res.status(404).json({ error: "Session not found" });

      const { actualPlayers, actualTrainers } = req.body;

      // Save actual attendance
      session.actualPlayers = actualPlayers;
      session.actualTrainers = actualTrainers;
      await session.save();

      const result = await aiService.checkSessionFeasibility(
        session,
        actualPlayers,
        actualTrainers
      );
      const { debug, ...feasibility } = result;
      res.json({ ...feasibility, debug: sanitizeDebug(debug) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
