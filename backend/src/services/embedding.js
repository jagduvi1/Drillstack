/**
 * Provider-agnostic embedding service.
 * Supports: voyage (Voyage AI), openai, ollama.
 * Provider and model are resolved at runtime from aiConfig (SiteConfig).
 *
 * Voyage AI free tier is heavily throttled (~3 req/min).
 * This module uses iterative exponential backoff with jitter — no recursion.
 */
const { getAISettings } = require("../config/aiConfig");

// ── Rate-limit / retry config ────────────────────────────────────────────────
const MAX_RETRIES = 8;
const INITIAL_BACKOFF_MS = 2_000; // 2 s
const MAX_BACKOFF_MS = 120_000; // 2 min cap
const JITTER_FACTOR = 0.3; // ±30 %

// Per-provider minimum interval between calls (simple throttle)
let lastVoyageCall = 0;
const VOYAGE_MIN_INTERVAL = 1_200; // ms – ~50 req/min ceiling, well within free tier

function backoffMs(attempt) {
  const base = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  const jitter = base * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

// ── Core embedding function ──────────────────────────────────────────────────
async function getEmbedding(text) {
  const settings = await getAISettings();
  const provider = settings.embedding_provider;
  const model = settings.embedding_model;
  const dimensions = settings.embedding_dimensions;

  switch (provider) {
    case "voyage":
      return voyageEmbedding(text, model);

    case "openai": {
      const OpenAI = require("openai");
      const client = new OpenAI({
        apiKey: process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY,
      });
      const res = await client.embeddings.create({ model, input: text, dimensions });
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

// ── Voyage AI with exponential backoff ───────────────────────────────────────
async function voyageEmbedding(text, model) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY not set");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Simple throttle — space out calls even when not rate-limited
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
      body: JSON.stringify({ model, input: [text] }),
    });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Voyage AI rate limit: still 429 after ${MAX_RETRIES} retries`
        );
      }
      const delay = backoffMs(attempt);
      console.warn(
        `Voyage 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Voyage AI error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.data[0].embedding;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function drillToEmbeddingText(drill) {
  const parts = [
    drill.title,
    drill.description,
    drill.howItWorks,
    drill.sport,
    drill.setup?.players,
    drill.setup?.space,
    ...(drill.setup?.equipment || []),
    ...(drill.coachingPoints || []),
    ...(drill.variations || []),
    ...(drill.commonMistakes || []),
  ].filter(Boolean);
  return parts.join(". ");
}

module.exports = { getEmbedding, drillToEmbeddingText };
