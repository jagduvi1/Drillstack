/**
 * Sync MongoDB documents to Qdrant (vectors) and Meilisearch (keyword index).
 *
 * Embedding jobs go through a sequential queue so we never fire multiple
 * concurrent Voyage AI requests (the free tier allows ~3 req/min).
 * Each drill gets an embeddingStatus that the frontend can poll.
 */
const { getQdrantClient, COLLECTION } = require("../config/qdrant");
const { getMeiliClient, isEnabled: meiliEnabled } = require("../config/meilisearch");
const { getEmbedding, drillToEmbeddingText } = require("./embedding");
const Drill = require("../models/Drill");
const crypto = require("crypto");

// ── Qdrant point ID helper ───────────────────────────────────────────────────
function pointId(mongoId) {
  const hash = crypto.createHash("md5").update(mongoId.toString()).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

// ── Embedding Queue ──────────────────────────────────────────────────────────
const embeddingQueue = []; // { drillId, resolve, reject }
let queueProcessing = false;

// Observable queue stats
const queueStats = {
  total: 0,
  completed: 0,
  failed: 0,
  get pending() {
    return embeddingQueue.length;
  },
  get processing() {
    return queueProcessing ? 1 : 0;
  },
  reset() {
    this.total = 0;
    this.completed = 0;
    this.failed = 0;
  },
};

function getQueueStatus() {
  return {
    pending: queueStats.pending,
    processing: queueStats.processing,
    completed: queueStats.completed,
    failed: queueStats.failed,
    total: queueStats.total,
  };
}

async function processQueue() {
  if (queueProcessing) return;
  queueProcessing = true;

  while (embeddingQueue.length > 0) {
    const job = embeddingQueue.shift();
    try {
      await processEmbeddingJob(job.drillId);
      queueStats.completed++;
      job.resolve();
    } catch (err) {
      queueStats.failed++;
      job.reject(err);
    }
  }

  queueProcessing = false;
  // Reset stats when queue drains so next batch starts fresh
  queueStats.reset();
}

async function processEmbeddingJob(drillId) {
  // Mark as processing
  await Drill.findByIdAndUpdate(drillId, {
    embeddingStatus: "processing",
    embeddingError: null,
  });

  try {
    const drill = await Drill.findById(drillId);
    if (!drill) throw new Error("Drill not found");

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
            intensity: drill.intensity || "",
          },
        },
      ],
    });

    await Drill.findByIdAndUpdate(drillId, {
      embeddingStatus: "indexed",
      embeddingError: null,
    });
  } catch (err) {
    console.error("Embedding job failed for drill", drillId, ":", err.message);
    await Drill.findByIdAndUpdate(drillId, {
      embeddingStatus: "failed",
      embeddingError: err.message,
    }).catch(() => {});
    throw err;
  }
}

// ── Public indexDrill — enqueues embedding + indexes keyword search ───────────
async function indexDrill(drill) {
  const drillId = drill._id;

  // Set initial pending status
  await Drill.findByIdAndUpdate(drillId, {
    embeddingStatus: "pending",
    embeddingError: null,
  }).catch(() => {});

  // Enqueue the vector embedding job (processed sequentially)
  queueStats.total++;
  const embeddingPromise = new Promise((resolve, reject) => {
    embeddingQueue.push({ drillId, resolve, reject });
  });

  // Kick off queue processing (non-blocking — errors tracked per-drill)
  processQueue().catch((err) =>
    console.error("Queue processing error:", err.message)
  );

  // Keyword index (Meilisearch) — fire-and-forget, not rate-limited
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      await meili.index("drills").addDocuments([
        {
          id: drill._id.toString(),
          title: drill.title,
          description: drill.description,
          sport: drill.sport || "",
          intensity: drill.intensity,
          howItWorks: drill.howItWorks || "",
          coachingPoints: drill.coachingPoints || [],
          equipment: drill.setup?.equipment || [],
          createdAt: drill.createdAt,
        },
      ]);
    } catch (err) {
      console.error("Meilisearch indexDrill error:", err.message);
    }
  }

  // We don't await the embedding promise here — callers can fire-and-forget.
  // The drill's embeddingStatus field tracks progress.
  return embeddingPromise;
}

async function indexSession(session) {
  if (meiliEnabled()) {
    try {
      const meili = getMeiliClient();
      await meili.index("sessions").addDocuments([
        {
          id: session._id.toString(),
          title: session.title,
          description: session.description || "",
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
          description: plan.description || "",
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

// ── Embedding similarity check ────────────────────────────────────────────────
async function checkEmbeddingSimilarity(parentDrillId, newDrillData) {
  const qdrant = getQdrantClient();
  const parentPointId = pointId(parentDrillId);

  // Retrieve the parent drill's vector from Qdrant
  let parentVector;
  try {
    const points = await qdrant.getPoints(COLLECTION, {
      ids: [parentPointId],
      with_vector: true,
    });
    parentVector = points?.[0]?.vector;
  } catch {
    // Parent not indexed yet — can't compare
    return { isSameDrill: true, similarity: 1, reason: "Parent drill not yet indexed." };
  }

  if (!parentVector) {
    return { isSameDrill: true, similarity: 1, reason: "Parent drill not yet indexed." };
  }

  // Compute embedding for the new/modified drill text
  const text = drillToEmbeddingText(newDrillData);
  const newVector = await getEmbedding(text);

  // Cosine similarity (vectors are normalized by Voyage, but compute properly just in case)
  const dot = parentVector.reduce((sum, v, i) => sum + v * newVector[i], 0);
  const magA = Math.sqrt(parentVector.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
  const similarity = magA && magB ? dot / (magA * magB) : 0;

  // Threshold: below 0.82 = fundamentally different drill
  const THRESHOLD = 0.82;
  const isSameDrill = similarity >= THRESHOLD;

  return {
    isSameDrill,
    similarity: Math.round(similarity * 1000) / 1000,
    reason: isSameDrill
      ? "The drill is still a variation of the original."
      : "The changes are significant enough that this looks like a different drill. Consider saving it as a new drill instead.",
  };
}

module.exports = {
  indexDrill,
  indexSession,
  indexPlan,
  removeDrill,
  getQueueStatus,
  checkEmbeddingSimilarity,
  pointId,
};
