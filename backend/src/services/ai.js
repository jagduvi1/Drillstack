/**
 * Provider-agnostic AI completion service for authoring assistance.
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
          max_tokens: 2048,
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

// ── Specific AI features ────────────────────────────────────────────────────

async function suggestTags(text) {
  const system = `You are a sports coaching assistant. Given a drill description, suggest relevant tags from these categories: individual_skills, coordination, perception, roles, didactic_strategy, game_form, intensity, equipment, success_criteria. Return JSON array of objects: [{"category":"...","name":"..."}].`;
  const raw = await complete(system, text);
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}

async function suggestGuidedQuestions(drillDescription) {
  const system = `You are a sports coaching assistant. Generate 3-5 guided discovery questions a coach could ask players during this drill. Return a JSON array of strings.`;
  const raw = await complete(system, drillDescription);
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}

async function suggestMistakes(drillDescription) {
  const system = `You are a sports coaching assistant. Identify 3-5 common mistakes players might make in this drill and corrective coaching cues. Return JSON array: [{"mistake":"...","correction":"..."}].`;
  const raw = await complete(system, drillDescription);
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}

async function suggestVariations(drillDescription) {
  const system = `You are a sports coaching assistant. Suggest 2-4 variations or progressions for this drill. Return JSON array: [{"title":"...","description":"..."}].`;
  const raw = await complete(system, drillDescription);
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}

async function summarizeDrill(drill) {
  const system = `You are a sports coaching assistant. Summarize this drill in 2-3 concise sentences suitable for inclusion in a session plan.`;
  return complete(system, JSON.stringify(drill));
}

module.exports = {
  complete,
  suggestTags,
  suggestGuidedQuestions,
  suggestMistakes,
  suggestVariations,
  summarizeDrill,
};
