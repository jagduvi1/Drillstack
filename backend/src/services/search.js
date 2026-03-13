const { getQdrantClient, COLLECTION } = require("../config/qdrant");
const { getMeiliClient, isEnabled: meiliEnabled } = require("../config/meilisearch");
const { getEmbedding } = require("./embedding");

// ── Semantic search (Qdrant) ────────────────────────────────────────────────

async function semanticSearch(query, { limit = 20, sport = null, type = null } = {}) {
  const vector = await getEmbedding(query);
  const qdrant = getQdrantClient();

  const filter = {};
  const must = [];
  if (sport) must.push({ key: "sport", match: { value: sport } });
  if (type) must.push({ key: "type", match: { value: type } });
  if (must.length) filter.must = must;

  const results = await qdrant.search(COLLECTION, {
    vector,
    limit,
    with_payload: true,
    filter: must.length ? filter : undefined,
  });

  return results.map((r) => ({
    id: r.payload.mongoId,
    type: r.payload.type,
    title: r.payload.title,
    score: r.score,
  }));
}

// ── Keyword search (Meilisearch) ────────────────────────────────────────────

async function keywordSearch(query, { index = "drills", limit = 20, sport = null } = {}) {
  if (!meiliEnabled()) return [];
  const meili = getMeiliClient();
  const idx = meili.index(index);

  const filter = sport ? `sport = "${sport}"` : undefined;
  const results = await idx.search(query, { limit, filter });
  return results.hits.map((hit) => ({
    id: hit.id,
    type: index.replace(/s$/, ""),
    title: hit.title,
    score: hit._rankingScore || 0,
  }));
}

// ── Hybrid search ───────────────────────────────────────────────────────────

async function hybridSearch(query, opts = {}) {
  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, opts),
    keywordSearch(query, opts),
  ]);

  // Merge results, preferring semantic scores, de-duplicate by id
  const map = new Map();
  for (const r of semantic) {
    map.set(r.id, { ...r, semanticScore: r.score, keywordScore: 0 });
  }
  for (const r of keyword) {
    if (map.has(r.id)) {
      map.get(r.id).keywordScore = r.score;
    } else {
      map.set(r.id, { ...r, semanticScore: 0, keywordScore: r.score });
    }
  }

  // Combined score: weighted average
  const merged = [...map.values()].map((r) => ({
    ...r,
    score: 0.7 * r.semanticScore + 0.3 * r.keywordScore,
  }));

  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, opts.limit || 20);
}

module.exports = { semanticSearch, keywordSearch, hybridSearch };
