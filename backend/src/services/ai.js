/**
 * AI service for drill generation and conversational refinement.
 * Provider and model resolved at runtime from SiteConfig (super admin editable).
 */
const { getAISettings } = require("../config/aiConfig");

async function complete(systemPrompt, userPrompt) {
  const settings = await getAISettings();
  const provider = settings.ai_provider;
  const model = settings.ai_model;

  switch (provider) {
    case "openai": {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: process.env.AI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      });
      return res.choices[0].message.content;
    }

    case "anthropic": {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.AI_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || "";
    }

    case "ollama": {
      const res = await fetch(
        `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: false,
          }),
        }
      );
      const data = await res.json();
      return data.message?.content || "";
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function completeChat(systemPrompt, messages) {
  const settings = await getAISettings();
  const provider = settings.ai_provider;
  const model = settings.ai_model;

  switch (provider) {
    case "openai": {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: process.env.AI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
      });
      return res.choices[0].message.content;
    }

    case "anthropic": {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.AI_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || "";
    }

    case "ollama": {
      const res = await fetch(
        `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            stream: false,
          }),
        }
      );
      const data = await res.json();
      return data.message?.content || "";
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// ── JSON parsing helper ─────────────────────────────────────────────────────

function parseJSON(raw) {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Drill generation system prompt ──────────────────────────────────────────

const DRILL_SYSTEM_PROMPT = `You are an expert sports coach and training designer. When given a description of a training drill (in any language), generate a complete, structured drill in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "title": "Short descriptive title for the drill",
  "description": "A rich 2-4 sentence description of what this drill trains and why it's effective",
  "sport": "The sport this drill is for (or 'general' if sport-agnostic)",
  "intensity": "low" | "medium" | "high",
  "setup": {
    "players": "Number and grouping of players, e.g. '8-12 players, split into 2 teams of 4-6'",
    "space": "Dimensions and layout, e.g. '30x20m rectangle with 2 small goals'",
    "equipment": ["list", "of", "equipment", "items", "with quantities"],
    "duration": "Suggested duration, e.g. '15-20 minutes'"
  },
  "howItWorks": "Detailed step-by-step explanation of how the drill flows. Write this as clear instructions a coach can follow. Include phases if applicable.",
  "coachingPoints": ["Key things the coach should observe and correct", "..."],
  "variations": ["Ways to make it easier/harder or change the focus", "..."],
  "commonMistakes": ["Common mistakes players make and how to fix them", "..."]
}

Guidelines:
- Be specific and practical — a coach should be able to run this drill from your description alone
- Include concrete numbers (dimensions, player counts, time)
- Coaching points should be actionable observations
- Variations should progress from easier to harder
- If the user writes in a specific language, respond in that same language
- Always return valid JSON only, no extra text`;

// ── Generate a complete drill from a description ────────────────────────────

async function generateDrill(userDescription, sport) {
  const prompt = sport
    ? `Sport: ${sport}\n\nDrill idea: ${userDescription}`
    : userDescription;

  const raw = await complete(DRILL_SYSTEM_PROMPT, prompt);
  try {
    return parseJSON(raw);
  } catch {
    return {
      title: "Untitled Drill",
      description: userDescription,
      sport: sport || "general",
      intensity: "medium",
      setup: { players: "", space: "", equipment: [], duration: "" },
      howItWorks: raw,
      coachingPoints: [],
      variations: [],
      commonMistakes: [],
    };
  }
}

// ── Refine a drill via conversation ─────────────────────────────────────────

const REFINE_SYSTEM_PROMPT = `You are an expert sports coach helping to refine a training drill through conversation.

The coach will describe changes they want to make to an existing drill. You must:
1. Understand what they want to change
2. Return the COMPLETE updated drill as JSON (same structure as below)
3. Incorporate their feedback while keeping everything else intact

Return ONLY valid JSON with this exact structure:
{
  "title": "...",
  "description": "...",
  "sport": "...",
  "intensity": "low" | "medium" | "high",
  "setup": {
    "players": "...",
    "space": "...",
    "equipment": ["..."],
    "duration": "..."
  },
  "howItWorks": "...",
  "coachingPoints": ["..."],
  "variations": ["..."],
  "commonMistakes": ["..."]
}

- Only modify what the coach asks to change
- Keep the rest of the drill intact
- If the coach writes in a specific language, respond in that language
- Always return valid JSON only, no extra text`;

async function refineDrill(currentDrill, conversationHistory) {
  const messages = [
    {
      role: "user",
      content: `Here is the current drill:\n${JSON.stringify(currentDrill, null, 2)}`,
    },
    { role: "assistant", content: "I have the drill. What changes would you like to make?" },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const raw = await completeChat(REFINE_SYSTEM_PROMPT, messages);
  try {
    return { drill: parseJSON(raw), message: null };
  } catch {
    return { drill: null, message: raw };
  }
}

// ── Generate a session plan from description ────────────────────────────────

async function generateSessionPlan(description, availableDrills) {
  const system = `You are an expert sports coach. Given a session description and available drills, suggest a training session structure.

Available drills:
${availableDrills.map((d) => `- "${d.title}" (${d.intensity}, ${d.setup?.duration || "?"}) — ${d.description?.slice(0, 100)}`).join("\n")}

Return JSON:
{
  "title": "Session title",
  "description": "Brief session description",
  "sections": [
    {
      "type": "warmup" | "main" | "cooldown",
      "drillTitles": ["titles of drills to use from the available list"],
      "notes": "Section-specific coaching notes"
    }
  ]
}

Only suggest drills from the available list. Return valid JSON only.`;

  const raw = await complete(system, description);
  try {
    return parseJSON(raw);
  } catch {
    return null;
  }
}

// ── Summarize a drill ───────────────────────────────────────────────────────

async function summarizeDrill(drill) {
  const system = `You are a sports coaching assistant. Summarize this drill in 2-3 concise sentences suitable for quick reference.`;
  return complete(system, JSON.stringify(drill));
}

// ── Training Program Generation ─────────────────────────────────────────────

const PROGRAM_SYSTEM_PROMPT = `You are an expert sports periodization coach and training program designer. When given a description of training goals, generate a complete, structured training program in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "title": "Program title",
  "description": "2-3 sentence overview of the program philosophy and expected outcomes",
  "sport": "the sport",
  "goals": ["list of specific training goals"],
  "focusAreas": ["key focus areas across the program"],
  "weeklyPlans": [
    {
      "week": 1,
      "theme": "Weekly theme, e.g. 'Build aerobic base and passing accuracy'",
      "sessions": [
        {
          "dayOfWeek": "Monday",
          "title": "Session title",
          "focus": "What this specific session trains",
          "intensity": "low" | "medium" | "high",
          "durationMinutes": 90,
          "notes": "Key coaching priorities and structure for this session"
        }
      ],
      "notes": "Week-level notes: load management, recovery, key observations"
    }
  ]
}

Guidelines:
- Build progressive overload: increase complexity/intensity across weeks
- Alternate high and low intensity days for recovery
- Each week should have a clear theme that builds on the previous
- Session notes should be specific enough that a coach can plan drills from them
- Include recovery/lighter sessions as appropriate
- Consider periodization principles (preparation, competition, transition phases)
- If the user writes in a specific language, respond in that same language
- Always return valid JSON only, no extra text`;

async function generateTrainingProgram({
  description,
  sport,
  sessionsPerWeek,
  weeks,
  startDate,
  endDate,
}) {
  const parts = [];
  if (sport) parts.push(`Sport: ${sport}`);
  if (sessionsPerWeek) parts.push(`Sessions per week: ${sessionsPerWeek}`);
  if (weeks) parts.push(`Duration: ${weeks} weeks`);
  else if (startDate && endDate) parts.push(`Period: ${startDate} to ${endDate}`);
  parts.push(`\nProgram request: ${description}`);

  const raw = await complete(PROGRAM_SYSTEM_PROMPT, parts.join("\n"));
  try {
    return parseJSON(raw);
  } catch {
    return {
      title: "Training Program",
      description,
      sport: sport || "general",
      goals: [],
      focusAreas: [],
      weeklyPlans: [],
    };
  }
}

// ── Refine a training program via conversation ──────────────────────────────

const REFINE_PROGRAM_PROMPT = `You are an expert sports periodization coach helping to refine a training program through conversation.

The coach will describe changes they want to make to an existing program. You must:
1. Understand what they want to change
2. Return the COMPLETE updated program as JSON (same structure as below)
3. Incorporate their feedback while keeping everything else intact

Return ONLY valid JSON with this exact structure:
{
  "title": "...",
  "description": "...",
  "sport": "...",
  "goals": ["..."],
  "focusAreas": ["..."],
  "weeklyPlans": [
    {
      "week": 1,
      "theme": "...",
      "sessions": [
        {
          "dayOfWeek": "...",
          "title": "...",
          "focus": "...",
          "intensity": "low" | "medium" | "high",
          "durationMinutes": 90,
          "notes": "..."
        }
      ],
      "notes": "..."
    }
  ]
}

- Only modify what the coach asks to change
- Keep the rest of the program intact
- Maintain periodization logic when making changes
- If the coach writes in a specific language, respond in that language
- Always return valid JSON only, no extra text`;

async function refineTrainingProgram(currentProgram, conversationHistory) {
  const messages = [
    {
      role: "user",
      content: `Here is the current training program:\n${JSON.stringify(currentProgram, null, 2)}`,
    },
    {
      role: "assistant",
      content: "I have the program. What changes would you like to make?",
    },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const raw = await completeChat(REFINE_PROGRAM_PROMPT, messages);
  try {
    return { program: parseJSON(raw), message: null };
  } catch {
    return { program: null, message: raw };
  }
}

// ── Adapt a planned session to real-world constraints ────────────────────────

const ADAPT_SESSION_PROMPT = `You are an expert sports coach. A coach has a planned training session but today's reality is different from what was planned (fewer players, fewer coaches, less space, missing equipment, etc.).

Take the ORIGINAL planned session and the REAL CONDITIONS and produce an adapted version that:
- Achieves the same training goals as much as possible
- Works with the actual number of players, coaches, space, and equipment available
- Adjusts drill structures, group sizes, and complexity as needed
- Keeps the same overall session structure (warmup → main → cooldown) where possible
- Is immediately actionable — a coach should be able to run this right now

Return ONLY valid JSON:
{
  "title": "Adapted session title",
  "changes": "1-2 sentence summary of what changed and why",
  "warmup": "What to do for warmup with these constraints",
  "main": "Detailed main phase — drills, group sizes, rotations, timing",
  "cooldown": "Cooldown activities",
  "coachingNotes": "Tips for making it work with fewer resources",
  "durationMinutes": 90
}

- Be practical and specific — real numbers, real timings
- If the user writes in a specific language, respond in that same language
- Always return valid JSON only, no extra text`;

async function adaptSession(originalSession, constraints) {
  const prompt = `ORIGINAL PLANNED SESSION:
${JSON.stringify(originalSession, null, 2)}

TODAY'S REAL CONDITIONS:
${constraints}

Please adapt this session for today's conditions.`;

  const raw = await complete(ADAPT_SESSION_PROMPT, prompt);
  try {
    return parseJSON(raw);
  } catch {
    return {
      title: originalSession.title + " (adapted)",
      changes: "Could not parse structured response",
      warmup: "",
      main: raw,
      cooldown: "",
      coachingNotes: "",
      durationMinutes: originalSession.durationMinutes || 60,
    };
  }
}

// ── Similarity check for versioning ──────────────────────────────────────────

const SIMILARITY_PROMPT = `You are a sports coaching assistant. Compare an ORIGINAL drill with an EDITED version and determine if they are still fundamentally the same drill (a variation/tweak) or if the edits have created something entirely different (a new drill).

Consider:
- Same core mechanic/exercise = same drill (even with different player counts, space, intensity)
- Changed rules, goals, or fundamental structure = new drill
- Adding/removing a phase or completely changing the flow = new drill
- Minor tweaks to setup, coaching points, or wording = same drill

Return ONLY valid JSON:
{
  "isSameDrill": true | false,
  "reason": "1-2 sentence explanation"
}`;

async function checkSimilarity(originalDrill, editedData) {
  const prompt = `ORIGINAL DRILL:
Title: ${originalDrill.title}
Description: ${originalDrill.description}
How it works: ${originalDrill.howItWorks || ""}

EDITED VERSION:
Title: ${editedData.title || originalDrill.title}
Description: ${editedData.description || originalDrill.description}
How it works: ${editedData.howItWorks || originalDrill.howItWorks || ""}`;

  const raw = await complete(SIMILARITY_PROMPT, prompt);
  try {
    return parseJSON(raw);
  } catch {
    return { isSameDrill: true, reason: "Could not determine — assuming same drill." };
  }
}

module.exports = {
  complete,
  completeChat,
  generateDrill,
  refineDrill,
  generateSessionPlan,
  summarizeDrill,
  generateTrainingProgram,
  refineTrainingProgram,
  adaptSession,
  checkSimilarity,
};
