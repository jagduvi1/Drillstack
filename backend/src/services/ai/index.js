/**
 * AI service — domain-specific generation and refinement functions.
 * Provider logic lives in ./providers.js, prompts in ./prompts.js.
 */
const { complete, completeWithDebug, completeChatWithDebug, parseJSON } = require("./providers");
const {
  buildDrillSystemPrompt,
  buildRefineDrillPrompt,
  buildProgramSystemPrompt,
  buildRefineProgramPrompt,
  buildAdaptSessionPrompt,
  SIMILARITY_PROMPT,
  buildSessionGenerationPrompt,
  buildRefineSessionPrompt,
  buildFeasibilityPrompt,
} = require("./prompts");

// ── Drill ────────────────────────────────────────────────────────────────────

async function generateDrill(userDescription, sport, { userSport } = {}) {
  const prompt = sport
    ? `Sport: ${sport}\n\nDrill idea: ${userDescription}`
    : userDescription;

  const { content: raw, debug } = await completeWithDebug(buildDrillSystemPrompt(userSport || sport), prompt);
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

async function refineDrill(currentDrill, conversationHistory, { userSport } = {}) {
  const messages = [
    { role: "user", content: `Here is the current drill:\n${JSON.stringify(currentDrill, null, 2)}` },
    { role: "assistant", content: "I have the drill. What changes would you like to make?" },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const { content: raw, debug } = await completeChatWithDebug(buildRefineDrillPrompt(userSport || currentDrill.sport), messages);
  try {
    return { drill: parseJSON(raw), message: null, debug };
  } catch {
    return { drill: null, message: raw, debug };
  }
}

async function summarizeDrill(drill, { userSport } = {}) {
  const sport = userSport || drill.sport;
  const persona = sport ? `${sport} coaching` : "sports coaching";
  const system = `You are a ${persona} assistant. Summarize this drill in 2-3 concise sentences suitable for quick reference.`;
  const { content, debug } = await completeWithDebug(system, JSON.stringify(drill));
  return { summary: content, debug };
}

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

// ── Session ──────────────────────────────────────────────────────────────────

async function generateSessionPlan(description, availableDrills, opts = {}) {
  const { numPlayers, totalMinutes, starredIds, userSport, sport,
    groupType, ageRange, numCoaches, spaceConstraint, hasCertification, unavailableEquipment } = opts;
  const playerInfo = numPlayers ? `Number of players: ${numPlayers}.` : "";
  const timeInfo = totalMinutes ? `Target total session time: ~${totalMinutes} minutes.` : "";

  // Build constraints string from advanced options
  const constraints = [];
  if (groupType) constraints.push(`Group type: ${groupType}`);
  if (ageRange) constraints.push(`Age range: ${ageRange}`);
  if (numCoaches) constraints.push(`Number of coaches: ${numCoaches}`);
  if (spaceConstraint) constraints.push(`Space: ${spaceConstraint.replace(/_/g, " ")}`);
  if (hasCertification === false) constraints.push("Coach does NOT have somersault/flip certification — do NOT include any somersault, flip, or inversion elements");
  if (hasCertification === true) constraints.push("Coach has somersault/flip certification — may include somersault and inversion elements if appropriate");
  if (unavailableEquipment?.length > 0) constraints.push(`Unavailable equipment (do NOT use): ${unavailableEquipment.join(", ")}`);
  const constraintInfo = constraints.length > 0 ? `\n\nCONSTRAINTS:\n${constraints.join("\n")}` : "";

  const starredSet = new Set((starredIds || []).map((id) => id.toString()));
  const drillList = availableDrills.map((d) => {
    const star = starredSet.has(d._id.toString()) ? " ★" : "";
    return `- "${d.title}"${star} (${d.intensity}, ${d.setup?.duration || "?"}, ${d.sport || "general"})`;
  }).join("\n");

  const system = buildSessionGenerationPrompt(playerInfo, timeInfo, drillList, userSport || sport);
  const { content: raw, debug } = await completeWithDebug(system, description + constraintInfo);
  try {
    return { plan: parseJSON(raw), debug };
  } catch {
    return { plan: null, debug };
  }
}

async function refineSession(currentSession, conversationHistory, availableDrillTitles = [], { userSport } = {}) {
  const messages = [
    { role: "user", content: `Here is the current session:\n${JSON.stringify(currentSession, null, 2)}` },
    { role: "assistant", content: "I have the session. What changes would you like to make?" },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const systemPrompt = buildRefineSessionPrompt(availableDrillTitles, userSport);
  const { content, debug } = await completeChatWithDebug(systemPrompt, messages);
  try {
    return { session: parseJSON(content), message: null, debug };
  } catch {
    return { session: null, message: content, debug };
  }
}

async function adaptSession(originalSession, constraints, { userSport } = {}) {
  const prompt = `ORIGINAL PLANNED SESSION:
${JSON.stringify(originalSession, null, 2)}

TODAY'S REAL CONDITIONS:
${constraints}

Please adapt this session for today's conditions.`;

  const { content: raw, debug } = await completeWithDebug(buildAdaptSessionPrompt(userSport || originalSession.sport), prompt);
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

async function checkSessionFeasibility(session, actualPlayers, actualTrainers, { userSport } = {}) {
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

  const system = buildFeasibilityPrompt(userSport || session.sport);
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

// ── Training Program ─────────────────────────────────────────────────────────

async function generateTrainingProgram({ description, sport, sessionsPerWeek, weeks, startDate, endDate, userSport }) {
  const parts = [];
  if (sport) parts.push(`Sport: ${sport}`);
  if (sessionsPerWeek) parts.push(`Sessions per week: ${sessionsPerWeek}`);
  if (weeks) parts.push(`Duration: ${weeks} weeks`);
  else if (startDate && endDate) parts.push(`Period: ${startDate} to ${endDate}`);
  parts.push(`\nProgram request: ${description}`);

  const { content: raw, debug } = await completeWithDebug(buildProgramSystemPrompt(userSport || sport), parts.join("\n"));
  try {
    return { program: parseJSON(raw), debug };
  } catch {
    return {
      program: {
        name: "Training Program",
        objective: description,
        sport: sport || "general",
        phases: [],
      },
      debug,
    };
  }
}

async function refineTrainingProgram(currentProgram, conversationHistory, { userSport } = {}) {
  const messages = [
    { role: "user", content: `Here is the current training program:\n${JSON.stringify(currentProgram, null, 2)}` },
    { role: "assistant", content: "I have the program. What changes would you like to make?" },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const { content: raw, debug } = await completeChatWithDebug(buildRefineProgramPrompt(userSport || currentProgram.sport), messages);
  try {
    return { program: parseJSON(raw), message: null, debug };
  } catch {
    return { program: null, message: raw, debug };
  }
}

module.exports = {
  complete,
  completeChat: require("./providers").completeChat,
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
