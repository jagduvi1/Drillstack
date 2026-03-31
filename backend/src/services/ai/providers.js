/**
 * AI provider abstraction — handles OpenAI, Anthropic, and Ollama.
 */
const { getAISettings } = require("../../config/aiConfig");

async function callProvider(provider, model, systemPrompt, messages) {
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
          max_tokens: 8192,
          system: systemPrompt,
          messages,
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(`Anthropic API error: ${data.error.type} — ${data.error.message}`);
      }
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

async function complete(systemPrompt, userPrompt) {
  const settings = await getAISettings();
  return callProvider(settings.ai_provider, settings.ai_model, systemPrompt, [
    { role: "user", content: userPrompt },
  ]);
}

async function completeChat(systemPrompt, messages) {
  const settings = await getAISettings();
  return callProvider(settings.ai_provider, settings.ai_model, systemPrompt, messages);
}

async function completeWithDebug(systemPrompt, userPrompt, { model: modelOverride } = {}) {
  const settings = await getAISettings();
  const provider = settings.ai_provider;
  const model = modelOverride || settings.ai_model;
  const startTime = Date.now();
  const content = await callProvider(provider, model, systemPrompt, [
    { role: "user", content: userPrompt },
  ]);
  return {
    content,
    debug: {
      provider,
      model,
      systemPrompt,
      userPrompt,
      rawResponse: content,
      durationMs: Date.now() - startTime,
    },
  };
}

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

function parseJSON(raw) {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = {
  complete,
  completeChat,
  completeWithDebug,
  completeChatWithDebug,
  parseJSON,
};
