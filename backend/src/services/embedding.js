/**
 * Provider-agnostic embedding service.
 * Supports: voyage (Voyage AI), openai, ollama.
 * Provider and model are resolved at runtime from aiConfig (SiteConfig).
 */
const { getAISettings } = require("../config/aiConfig");

// Voyage AI rate-limit backoff state
let lastVoyageCall = 0;
const VOYAGE_MIN_INTERVAL = 350; // ms between calls (free tier ≈ 3 req/min)

async function getEmbedding(text) {
  const settings = await getAISettings();
  const provider = settings.embedding_provider;
  const model = settings.embedding_model;
  const dimensions = settings.embedding_dimensions;

  switch (provider) {
    case "voyage": {
      const apiKey = process.env.VOYAGE_API_KEY;
      if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

      // Simple throttle
      const now = Date.now();
      const wait = VOYAGE_MIN_INTERVAL - (now - lastVoyageCall);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastVoyageCall = Date.now();

      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [text],
          input_type: "document",
        }),
      });

      if (res.status === 429) {
        // Back off and retry once
        await new Promise((r) => setTimeout(r, 2000));
        return getEmbedding(text);
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Voyage AI error ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.data[0].embedding;
    }

    case "openai": {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY });
      const res = await client.embeddings.create({
        model,
        input: text,
        dimensions,
      });
      return res.data[0].embedding;
    }

    case "ollama": {
      const res = await fetch(
        `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/embeddings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        }
      );
      const data = await res.json();
      return data.embedding;
    }

    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

function drillToEmbeddingText(drill) {
  const parts = [
    drill.title,
    drill.purpose,
    ...(drill.guidedQuestions || []),
    ...(drill.rules || []),
    drill.instructionFocus?.active?.description,
  ].filter(Boolean);
  return parts.join(". ");
}

module.exports = { getEmbedding, drillToEmbeddingText };
