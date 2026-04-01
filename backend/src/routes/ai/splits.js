const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { standardLimiter } = require("../../utils/rateLimiters");
const { checkAiLimit } = require("../../middleware/planLimits");
const { completeWithDebug, parseJSON } = require("../../services/ai/providers");
const Player = require("../../models/Player");

router.use(standardLimiter);
router.use(authenticate);

// POST /api/ai/split-simple — random equal split into N groups
router.post(
  "/split-simple",
  [body("playerIds").isArray({ min: 2 }), body("groupCount").isInt({ min: 2, max: 20 })],
  validate,
  async (req, res, next) => {
    try {
      const { playerIds, groupCount, guestPlayers = [] } = req.body;
      const players = await Player.find({ _id: { $in: playerIds } }).select("name position number");
      // Add guest players with synthetic IDs
      const guests = guestPlayers.slice(0, 20).map((g, i) => ({
        _id: `guest-${i}`,
        name: String(g.name || "Guest").slice(0, 100),
        position: String(g.position || "").slice(0, 50),
        isGuest: true,
      }));
      const allPlayers = [...players, ...guests];
      if (allPlayers.length < groupCount) {
        return res.status(400).json({ error: "Not enough players for the requested number of groups" });
      }

      // Shuffle and distribute evenly
      const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
      const groups = Array.from({ length: groupCount }, () => []);
      shuffled.forEach((p, i) => groups[i % groupCount].push(p));

      res.json({
        groups: groups.map((g, i) => ({
          name: `Group ${i + 1}`,
          players: g,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/split-smart — AI-powered balanced split using player profiles
router.post(
  "/split-smart",
  checkAiLimit,
  [
    body("playerIds").isArray({ min: 2 }),
    body("groupCount").isInt({ min: 2, max: 20 }),
    body("criteria").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { playerIds, groupCount, criteria, guestPlayers = [] } = req.body;
      const players = await Player.find({ _id: { $in: playerIds } })
        .select("name position strengths weaknesses notes");
      // Add guest players
      const guests = guestPlayers.slice(0, 20).map((g, i) => ({
        _id: `guest-${i}`,
        name: String(g.name || "Guest").slice(0, 100),
        position: String(g.position || "").slice(0, 50),
        strengths: [],
        weaknesses: [],
        isGuest: true,
      }));
      const allPlayers = [...players, ...guests];
      if (allPlayers.length < groupCount) {
        return res.status(400).json({ error: "Not enough players" });
      }

      const playerList = allPlayers.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        position: p.position || "unknown",
        strengths: (p.strengths || []).join(", ") || "none listed",
        weaknesses: (p.weaknesses || []).join(", ") || "none listed",
        ...(p.isGuest ? { note: "Guest player — no profile data available" } : {}),
      }));

      const systemPrompt = `You are a sports training assistant. Split players into balanced groups.
Consider their positions, strengths, and weaknesses to create fair and balanced groups.
Each group should have a mix of skill levels and positions when possible.
Return ONLY valid JSON, no markdown.`;

      const userMessage = `Split these ${players.length} players into ${groupCount} balanced groups.
${criteria ? `Coach's criteria: ${criteria}` : "Make groups as balanced as possible."}

Players:
${JSON.stringify(playerList, null, 2)}

Return JSON in this exact format:
{
  "groups": [
    { "name": "Group 1", "playerIds": ["id1", "id2"], "reasoning": "why these players together" },
    { "name": "Group 2", "playerIds": ["id3", "id4"], "reasoning": "why these players together" }
  ],
  "summary": "overall reasoning for the split"
}`;

      const { text, debug } = await completeWithDebug(systemPrompt, [
        { role: "user", content: userMessage },
      ]);

      const parsed = parseJSON(text);
      if (!parsed?.groups) {
        return res.status(500).json({ error: "AI returned invalid format", debug });
      }

      // Map player IDs back to full player objects
      const playerMap = new Map(allPlayers.map((p) => [p._id.toString(), p]));
      const groups = parsed.groups.map((g) => ({
        name: g.name,
        reasoning: g.reasoning || "",
        players: (g.playerIds || []).map((id) => playerMap.get(id)).filter(Boolean),
      }));

      res.json({ groups, summary: parsed.summary || "", debug });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
