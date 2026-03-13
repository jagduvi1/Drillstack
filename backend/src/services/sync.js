/**
 * Sync MongoDB documents to Qdrant (vectors) and Meilisearch (keyword index).
 */
const { getQdrantClient, COLLECTION } = require("../config/qdrant");
const { getMeiliClient, isEnabled: meiliEnabled } = require("../config/meilisearch");
const { getEmbedding, drillToEmbeddingText } = require("./embedding");
const crypto = require("crypto");

function pointId(mongoId) {
  // Qdrant needs a UUID-like string id; deterministically derive one from Mongo ObjectId
  const hash = crypto.createHash("md5").update(mongoId.toString()).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

async function indexDrill(drill) {
  // Vector index
  try {
    const text = drillToEmbeddingText(drill);
    const vector = await getEmbedding(text);
    const qdrant = getQdrantClient();
    await qdrant.upsert(COLLECTION, {
      points: [
        {
          id: pointId(drill._id),
          vector,
          payload: {
            mongoId: drill._id.toString(),
            type: "drill",
            title: drill.title,
            sport: drill.sport || "",
          },
        },
      ],
    });
  } catch (err) {
    console.error("Qdrant indexDrill error:", err.message);
  }

  // Keyword index
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      const tags = (drill.tags || []).map((t) => t.category);
      await meili.index("drills").addDocuments([
        {
          id: drill._id.toString(),
          title: drill.title,
          purpose: drill.purpose,
          sport: drill.sport || "",
          intensity: drill.intensity,
          tags,
          guidedQuestions: drill.guidedQuestions || [],
          rules: drill.rules || [],
          createdAt: drill.createdAt,
        },
      ]);
    } catch (err) {
      console.error("Meilisearch indexDrill error:", err.message);
    }
  }
}

async function indexSession(session) {
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      await meili.index("sessions").addDocuments([
        {
          id: session._id.toString(),
          title: session.title,
          sport: session.sport || "",
          date: session.date,
        },
      ]);
    } catch (err) {
      console.error("Meilisearch indexSession error:", err.message);
    }
  }
}

async function indexPlan(plan) {
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      await meili.index("plans").addDocuments([
        {
          id: plan._id.toString(),
          title: plan.title,
          sport: plan.sport || "",
          startDate: plan.startDate,
        },
      ]);
    } catch (err) {
      console.error("Meilisearch indexPlan error:", err.message);
    }
  }
}

async function removeDrill(drillId) {
  try {
    const qdrant = getQdrantClient();
    await qdrant.delete(COLLECTION, { points: [pointId(drillId)] });
  } catch (err) {
    console.error("Qdrant removeDrill error:", err.message);
  }
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      await meili.index("drills").deleteDocument(drillId.toString());
    } catch (err) {
      console.error("Meilisearch removeDrill error:", err.message);
    }
  }
}

module.exports = { indexDrill, indexSession, indexPlan, removeDrill };
