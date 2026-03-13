/**
 * Provider-agnostic AI and embedding configuration.
 * Swap providers via env vars without touching app code.
 */

function getAIConfig() {
  return {
    provider: process.env.AI_PROVIDER || "openai",
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || "gpt-4o",
  };
}

function getEmbeddingConfig() {
  return {
    provider: process.env.EMBEDDING_PROVIDER || "openai",
    apiKey: process.env.EMBEDDING_API_KEY,
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 1536,
  };
}

module.exports = { getAIConfig, getEmbeddingConfig };
