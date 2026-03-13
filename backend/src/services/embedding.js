/**
 * Provider-agnostic embedding service.
 * Currently supports: openai, ollama.
 * Add new providers by adding a case to getEmbedding().
 */
const { getEmbeddingConfig } = require("../config/ai");

async function getEmbedding(text) {
  const cfg = getEmbeddingConfig();

  switch (cfg.provider) {
    case "openai": {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: cfg.apiKey });
      const res = await client.embeddings.create({
        model: cfg.model,
        input: text,
        dimensions: cfg.dimensions,
      });
      return res.data[0].embedding;
    }

    case "ollama": {
      const res = await fetch(
        `${process.env.OLLAMA_URL || "http://localhost:11434"}/api/embeddings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: cfg.model, prompt: text }),
        }
      );
      const data = await res.json();
      return data.embedding;
    }

    default:
      throw new Error(`Unsupported embedding provider: ${cfg.provider}`);
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
