/**
 * Runtime AI configuration — settings stored in MongoDB SiteConfig,
 * cached in memory, editable by super admin without restart.
 */
const SiteConfig = require("../models/SiteConfig");

// In-memory cache
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

const DEFAULTS = {
  // AI completion
  ai_provider: process.env.AI_PROVIDER || "openai",
  ai_model: process.env.AI_MODEL || "gpt-4o",

  // Embedding
  embedding_provider: process.env.EMBEDDING_PROVIDER || "voyage",
  embedding_model: process.env.EMBEDDING_MODEL || "voyage-3-lite",
  embedding_dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 1024,

  // System prompt for AI assistance
  ai_system_prompt:
    "You are a sports coaching assistant helping coaches design effective training exercises.",
};

async function getAISettings() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  const settings = { ...DEFAULTS };
  try {
    const docs = await SiteConfig.find({
      key: { $regex: /^ai_/ },
    });
    for (const doc of docs) {
      settings[doc.key] = doc.value;
    }
  } catch {
    // Fall back to defaults
  }
  cache = settings;
  cacheTime = Date.now();
  return settings;
}

function invalidateCache() {
  cache = null;
  cacheTime = 0;
}

async function updateAISetting(key, value, userId) {
  await SiteConfig.setValue(key, value, userId, `AI setting: ${key}`);
  invalidateCache();
}

module.exports = { getAISettings, updateAISetting, invalidateCache, DEFAULTS };
