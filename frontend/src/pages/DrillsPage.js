import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getDrills, deleteDrill, getEmbeddingStatus } from "../api/drills";
import { FiPlus, FiTrash2, FiEdit, FiZap, FiLoader, FiCheck, FiAlertCircle } from "react-icons/fi";

const STATUS_LABELS = {
  pending: "Queued",
  processing: "Indexing...",
  indexed: "Indexed",
  failed: "Failed",
};

function EmbeddingBadge({ status }) {
  if (!status || status === "indexed") return null;
  const cls =
    status === "failed"
      ? "embedding-badge embedding-badge-failed"
      : "embedding-badge embedding-badge-pending";
  const Icon = status === "failed" ? FiAlertCircle : FiLoader;
  return (
    <span className={cls}>
      <Icon className={status === "processing" ? "spin" : ""} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function DrillsPage() {
  const [page, setPage] = useState(1);
  const [sport, setSport] = useState("");
  const { data, loading, refetch } = useFetch(
    () => getDrills({ page, sport: sport || undefined }),
    [page, sport]
  );

  // Poll embedding queue status while any drill is pending/processing
  const [queue, setQueue] = useState(null);
  const hasActive = data?.drills?.some(
    (d) => d.embeddingStatus === "pending" || d.embeddingStatus === "processing"
  );

  useEffect(() => {
    if (!hasActive) { setQueue(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await getEmbeddingStatus();
        if (!cancelled) setQueue(res.data);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(() => { poll(); refetch(); }, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [hasActive, refetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this drill?")) return;
    await deleteDrill(id);
    refetch();
  };

  const queueTotal = queue?.total || 0;
  const queueDone = (queue?.completed || 0) + (queue?.failed || 0);
  const queuePct = queueTotal > 0 ? Math.round((queueDone / queueTotal) * 100) : 0;

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Drills</h1>
        <Link to="/drills/new" className="btn btn-primary"><FiPlus /> New Drill</Link>
      </div>

      {/* Global embedding progress bar */}
      {hasActive && queueTotal > 0 && (
        <div className="embedding-progress mb-1">
          <div className="embedding-progress-header">
            <FiLoader className="spin" />
            <span>Indexing drills for search... {queueDone}/{queueTotal}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${queuePct}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-sm mb-1">
        <input
          className="form-control"
          placeholder="Filter by sport..."
          style={{ maxWidth: 200 }}
          value={sport}
          onChange={(e) => { setSport(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {data?.drills?.length ? (
            <div className="drill-grid">
              {data.drills.map((d) => (
                <Link key={d._id} to={`/drills/${d._id}`} className="drill-card card">
                  <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1rem", margin: 0 }}>{d.title}</h3>
                    <span className={`tag tag-${d.intensity === "high" ? "danger" : d.intensity === "low" ? "" : "warning"}`}>
                      {d.intensity}
                    </span>
                  </div>
                  <p className="text-sm text-muted" style={{ marginBottom: "0.75rem", lineHeight: 1.4 }}>
                    {d.description?.slice(0, 120)}{d.description?.length > 120 ? "..." : ""}
                  </p>
                  <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                    {d.sport && <span className="tag">{d.sport}</span>}
                    {d.setup?.duration && <span className="tag">{d.setup.duration}</span>}
                    {d.setup?.players && <span className="tag">{d.setup.players.split(",")[0]}</span>}
                    <EmbeddingBadge status={d.embeddingStatus} />
                  </div>
                  <div className="drill-card-actions" onClick={(e) => e.preventDefault()}>
                    <Link to={`/drills/${d._id}/edit`} className="btn btn-secondary btn-sm"><FiEdit /></Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d._id)}><FiTrash2 /></button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <FiZap style={{ fontSize: "2rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
              <p className="text-muted">No drills yet. Create your first drill to get started.</p>
              <Link to="/drills/new" className="btn btn-primary mt-1"><FiPlus /> Create Drill</Link>
            </div>
          )}

          {data?.pages > 1 && (
            <div className="flex gap-sm mt-1" style={{ justifyContent: "center" }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
