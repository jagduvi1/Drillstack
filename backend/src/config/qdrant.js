const { QdrantClient } = require("@qdrant/js-client-rest");

let client = null;

function getQdrantClient() {
  if (!client) {
    const url = process.env.QDRANT_URL || "http://localhost:6333";
    client = new QdrantClient({ url });
  }
  return client;
}

const COLLECTION = process.env.QDRANT_COLLECTION || "training_bank";
const DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 1536;

async function ensureCollection() {
  const qdrant = getQdrantClient();
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: DIMENSIONS, distance: "Cosine" },
    });
    console.log(`Qdrant collection "${COLLECTION}" created (dim=${DIMENSIONS})`);
  }
}

module.exports = { getQdrantClient, ensureCollection, COLLECTION };
