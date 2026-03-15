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

// Debug-aware wrapper: returns { content, debug }
async function completeWithDebug(systemPrompt, userPrompt) {
  const settings = await getAISettings();
  const startTime = Date.now();
  const content = await complete(systemPrompt, userPrompt);
  return {
    content,
    debug: {
      provider: settings.ai_provider,
      model: settings.ai_model,
      systemPrompt,
      userPrompt,
      rawResponse: content,
      durationMs: Date.now() - startTime,
    },
  };
}

// Debug-aware chat wrapper: returns { content, debug }
async function completeChatWithDebug(systemPrompt, messages) {
  const settings = await getAISettings();
  const startTime = Date.now();
  const content = await completeChat(systemPrompt, messages);
  return {
    content,
    debug: {
      provider: settings.ai_provider,
      model: settings.ai_model,
      systemPrompt,
      userPrompt: JSON.stringify(messages),
      rawResponse: content,
      durationMs: Date.now() - startTime,
    },
  };
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

  const { content: raw, debug } = await completeWithDebug(DRILL_SYSTEM_PROMPT, prompt);
  try {
    return { drill: parseJSON(raw), debug };
  } catch {
    return {
      drill: {
        title: "Untitled Drill",
        description: userDescription,
        sport: sport || "general",
        intensity: "medium",
        setup: { players: "", space: "", equipment: [], duration: "" },
        howItWorks: raw,
        coachingPoints: [],
        variations: [],
        commonMistakes: [],
      },
      debug,
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

  const { content: raw, debug } = await completeChatWithDebug(REFINE_SYSTEM_PROMPT, messages);
  try {
    return { drill: parseJSON(raw), message: null, debug };
  } catch {
    return { drill: null, message: raw, debug };
  }
}

// ── Generate a session plan from description ────────────────────────────────

async function generateSessionPlan(description, availableDrills, opts = {}) {
  const { numPlayers, totalMinutes, starredIds } = opts;
  const playerInfo = numPlayers ? `Number of players: ${numPlayers}.` : "";
  const timeInfo = totalMinutes ? `Target total session time: ~${totalMinutes} minutes.` : "";

  const starredSet = new Set((starredIds || []).map((id) => id.toString()));
  const drillList = availableDrills.map((d) => {
    const star = starredSet.has(d._id.toString()) ? " ★" : "";
    return `- "${d.title}"${star} (${d.intensity}, ${d.setup?.duration || "?"}, ${d.sport || "general"})`;
  }).join("\n");

  const system = `You are an expert sports coach. Given a session description and available drills, suggest a training session using flexible blocks.

${playerInfo} ${timeInfo}

AVAILABLE DRILLS — this is the COMPLETE list of drills available. Drills marked with ★ are the coach's favorites — prefer those when they fit. You may ONLY use these exact titles. Do NOT invent, create, or make up ANY activity or drill names. If you need a closing game, warmup, or any activity — pick one from this list or skip it:
${drillList}

Block types you can use:
- "drills": A sequence of drills. EVERY drillTitle MUST be copied EXACTLY from the list above — no descriptions, no subtitles, no modifications. Just the title as-is.
- "stations": Station rotation. EVERY drillTitle MUST be copied EXACTLY from the list above — just the title, nothing added.
- "matchplay": ONLY for generic game formats (e.g. "4v4 small-sided game") — never use named activities here.
- "break": Rest/water break.
- "custom": ONLY for non-drill activities like "team talk", "stretching", "cooldown jog". Do NOT put named games or drills here. Keep labels generic.

IMPORTANT rules for drillTitle fields:
- Copy the title EXACTLY as it appears in the available list. Do NOT append descriptions, subtitles, or explanations to the title.
- Example: if the drill is called "Zombiefotboll", write "Zombiefotboll" — NOT "Zombiefotboll – Passningsspel med zombier".
- Do NOT add notes that re-explain the drill. The coach already has the full drill details in the system.

Return JSON:
{
  "title": "Session title",
  "description": "Brief session overview",
  "blocks": [
    {
      "type": "drills",
      "label": "e.g. Warmup",
      "drillTitles": ["exact title from list"],
      "durations": [10, 8]
    },
    {
      "type": "stations",
      "label": "e.g. Technical Circuit",
      "stationCount": 4,
      "rotationMinutes": 5,
      "stationDrills": [
        { "stationNumber": 1, "drillTitle": "exact title from list" },
        { "stationNumber": 2, "drillTitle": "exact title from list" }
      ]
    },
    {
      "type": "matchplay",
      "label": "e.g. Small-Sided Games",
      "duration": 15,
      "matchDescription": "4v4 on small goals",
      "rules": "Max 3 touches"
    },
    {
      "type": "break",
      "label": "Water Break",
      "duration": 3
    },
    {
      "type": "custom",
      "label": "e.g. Team Talk",
      "duration": 5,
      "customContent": "Brief description"
    }
  ]
}

CRITICAL: Every drillTitle MUST be an EXACT copy from the available drills list — no extra text, no descriptions appended. Do NOT invent any drill or activity names anywhere in the response. Return valid JSON only.`;

  const { content: raw, debug } = await completeWithDebug(system, description);
  try {
    return { plan: parseJSON(raw), debug };
  } catch {
    return { plan: null, debug };
  }
}

// ── Refine a session via conversation ────────────────────────────────────────

function buildRefineSessionPrompt(availableDrillTitles) {
  const drillListStr = availableDrillTitles.length > 0
    ? availableDrillTitles.map((t) => `- "${t}"`).join("\n")
    : "(no drills available)";

  return `You are an expert sports coach helping to refine a training session through conversation.

The coach will describe changes they want to make to an existing session. You must:
1. Understand what they want to change
2. Return the COMPLETE updated session as JSON (same structure as below)
3. Incorporate their feedback while keeping everything else intact

AVAILABLE DRILLS — this is the COMPLETE list of drills in the system. You may ONLY use these exact titles. Do NOT invent ANY activity or drill names anywhere in the response:
${drillListStr}

Block types:
- "drills": Sequential drills. EVERY drillTitle MUST be an EXACT copy from the list above — no descriptions appended.
- "stations": Station rotation. EVERY drillTitle MUST be an EXACT copy from the list above — just the title, nothing added.
- "matchplay": ONLY for generic game formats (e.g. "4v4 small-sided game"). Never use named activities here.
- "break": Rest/water break with duration.
- "custom": ONLY for non-drill activities like "team talk", "stretching". Do NOT put named games or drills here.

Return ONLY valid JSON:
{
  "title": "...",
  "description": "...",
  "blocks": [
    {
      "type": "drills",
      "label": "...",
      "drills": [{ "drillTitle": "exact title from list", "duration": 10 }]
    },
    {
      "type": "stations",
      "label": "...",
      "stationCount": 4,
      "rotationMinutes": 5,
      "stationDrills": [{ "stationNumber": 1, "drillTitle": "exact title from list" }]
    },
    {
      "type": "matchplay",
      "label": "...",
      "duration": 15,
      "matchDescription": "...",
      "rules": "..."
    },
    {
      "type": "break",
      "label": "...",
      "duration": 3
    },
    {
      "type": "custom",
      "label": "...",
      "duration": 5,
      "customContent": "..."
    }
  ]
}

- Only modify what the coach asks to change
- Keep the rest of the session intact
- CRITICAL: Every drillTitle MUST be an EXACT copy from the available drills list — no extra text, no descriptions appended. NEVER invent drill or activity names.
- If the coach writes in a specific language, respond in that language
- Always return valid JSON only, no extra text`;
}

async function refineSession(currentSession, conversationHistory, availableDrillTitles = []) {
  const messages = [
    {
      role: "user",
      content: `Here is the current session:\n${JSON.stringify(currentSession, null, 2)}`,
    },
    {
      role: "assistant",
      content: "I have the session. What changes would you like to make?",
    },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const systemPrompt = buildRefineSessionPrompt(availableDrillTitles);
  const { content, debug } = await completeChatWithDebug(
    systemPrompt,
    messages
  );
  try {
    return { session: parseJSON(content), message: null, debug };
  } catch {
    return { session: null, message: content, debug };
  }
}

// ── Summarize a drill ───────────────────────────────────────────────────────

async function summarizeDrill(drill) {
  const system = `You are a sports coaching assistant. Summarize this drill in 2-3 concise sentences suitable for quick reference.`;
  const { content, debug } = await completeWithDebug(system, JSON.stringify(drill));
  return { summary: content, debug };
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

  const { content: raw, debug } = await completeWithDebug(PROGRAM_SYSTEM_PROMPT, parts.join("\n"));
  try {
    return { program: parseJSON(raw), debug };
  } catch {
    return {
      program: {
        title: "Training Program",
        description,
        sport: sport || "general",
        goals: [],
        focusAreas: [],
        weeklyPlans: [],
      },
      debug,
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

  const { content: raw, debug } = await completeChatWithDebug(REFINE_PROGRAM_PROMPT, messages);
  try {
    return { program: parseJSON(raw), message: null, debug };
  } catch {
    return { program: null, message: raw, debug };
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

  const { content: raw, debug } = await completeWithDebug(ADAPT_SESSION_PROMPT, prompt);
  try {
    return { adapted: parseJSON(raw), debug };
  } catch {
    return {
      adapted: {
        title: originalSession.title + " (adapted)",
        changes: "Could not parse structured response",
        warmup: "",
        main: raw,
        cooldown: "",
        coachingNotes: "",
        durationMinutes: originalSession.durationMinutes || 60,
      },
      debug,
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

// ── Session feasibility check ────────────────────────────────────────────────

async function checkSessionFeasibility(session, actualPlayers, actualTrainers) {
  const blocksDesc = (session.blocks || []).map((b) => {
    let desc = `[${b.type}] "${b.label || b.type}"`;
    if (b.type === "drills") {
      const drillNames = (b.drills || []).map((d) => d.drill?.title || "drill").join(", ");
      desc += ` — drills: ${drillNames}`;
    }
    if (b.type === "stations") {
      desc += ` — ${b.stationCount} stations, ${b.rotationMinutes} min rotation`;
      const stationDrills = (b.stations || []).map((s) => `Station ${s.stationNumber}: ${s.drill?.title || "unset"}`).join(", ");
      desc += ` (${stationDrills})`;
    }
    if (b.type === "matchplay") {
      desc += ` — ${b.matchDescription || ""}, ${b.duration} min`;
      if (b.rules) desc += ` rules: ${b.rules}`;
    }
    if (b.type === "break") desc += ` — ${b.duration} min`;
    if (b.type === "custom") desc += ` — ${b.customContent || ""}, ${b.duration} min`;
    if (b.notes) desc += ` (notes: ${b.notes})`;
    return desc;
  }).join("\n");

  const system = `You are an expert sports coach. A training session was planned for a certain number of players and trainers, but the actual attendance is different. Check if the session is still feasible and suggest specific changes if needed.

Consider:
- Station training needs enough players per station to make the drill work (usually at least 2-3 per station)
- Station training may need trainers at each station depending on the drill complexity
- Match play formats need the right player count (e.g. 4v4 needs 8 players minimum)
- Some drills have minimum player requirements
- With fewer trainers, complex stations may need to be simplified or merged
- With more or fewer players, group sizes and game formats should be adjusted

Return JSON:
{
  "feasible": true/false,
  "summary": "One sentence overall assessment",
  "issues": [
    {
      "blockLabel": "which block has an issue",
      "problem": "what the problem is",
      "suggestion": "specific fix"
    }
  ],
  "adaptedBlocks": [
    // ONLY include blocks that need changes. Same structure as input but with adjustments.
    // Include the block index (0-based) so the frontend knows which block to update.
    {
      "blockIndex": 0,
      "changes": "what changed and why",
      "label": "possibly updated label",
      "stationCount": 3,
      "rotationMinutes": 6,
      "matchDescription": "updated if needed",
      "rules": "updated if needed",
      "duration": 15,
      "notes": "updated coaching notes"
    }
  ]
}

If no changes are needed, return feasible: true with an empty issues array and empty adaptedBlocks.
Return valid JSON only.`;

  const prompt = `Session: "${session.title}"
Sport: ${session.sport || "general"}
Originally planned for: ${session.expectedPlayers} players, ${session.expectedTrainers} trainers
Actual attendance: ${actualPlayers} players, ${actualTrainers} trainers

Session blocks:
${blocksDesc}`;

  const { content: raw, debug } = await completeWithDebug(system, prompt);
  try {
    return { ...parseJSON(raw), debug };
  } catch {
    return {
      feasible: true,
      summary: "Could not analyze — the session should work as planned.",
      issues: [],
      adaptedBlocks: [],
      debug,
    };
  }
}

module.exports = {
  complete,
  completeChat,
  completeWithDebug,
  generateDrill,
  refineDrill,
  generateSessionPlan,
  refineSession,
  summarizeDrill,
  generateTrainingProgram,
  refineTrainingProgram,
  adaptSession,
  checkSimilarity,
  checkSessionFeasibility,
};
