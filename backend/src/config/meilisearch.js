const { MeiliSearch } = require("meilisearch");

let client = null;

function isEnabled() {
  return process.env.ENABLE_MEILISEARCH === "true";
}

function getMeiliClient() {
  if (!isEnabled()) return null;
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILI_URL || "http://localhost:7700",
      apiKey: process.env.MEILI_MASTER_KEY || "masterkey",
    });
  }
  return client;
}

async function ensureIndexes() {
  if (!isEnabled()) return;
  const meili = getMeiliClient();

  const indexes = [
    {
      uid: "drills",
      primaryKey: "id",
      searchableAttributes: ["title", "description", "howItWorks", "coachingPoints", "equipment"],
      filterableAttributes: ["sport", "intensity"],
      sortableAttributes: ["createdAt", "title"],
    },
    {
      uid: "sessions",
      primaryKey: "id",
      searchableAttributes: ["title", "description", "sport"],
      filterableAttributes: ["sport"],
      sortableAttributes: ["date", "title"],
    },
    {
      uid: "plans",
      primaryKey: "id",
      searchableAttributes: ["title", "description", "sport"],
      filterableAttributes: ["sport"],
      sortableAttributes: ["startDate", "title"],
    },
  ];

  for (const idx of indexes) {
    const { uid, primaryKey, ...settings } = idx;
    await meili.createIndex(uid, { primaryKey });
    const index = meili.index(uid);
    await index.updateSettings(settings);
  }
  console.log("Meilisearch indexes configured");
}

module.exports = { getMeiliClient, ensureIndexes, isEnabled };
