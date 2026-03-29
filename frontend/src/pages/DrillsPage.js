import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getDrills, deleteDrill, getEmbeddingStatus, toggleStar } from "../api/drills";
import { FiPlus, FiTrash2, FiEdit, FiZap, FiLoader, FiCheck, FiAlertCircle, FiStar, FiUser } from "react-icons/fi";
import Pagination from "../components/common/Pagination";

function EmbeddingBadge({ status }) {
  const { t } = useTranslation();
  if (!status || status === "indexed") return null;
  const statusLabels = { pending: t("drills.statusQueued"), processing: t("drills.statusIndexing"), indexed: t("drills.statusIndexed"), failed: t("drills.statusFailed") };
  const cls =
    status === "failed"
      ? "embedding-badge embedding-badge-failed"
      : "embedding-badge embedding-badge-pending";
  const Icon = status === "failed" ? FiAlertCircle : FiLoader;
  return (
    <span className={cls}>
      <Icon className={status === "processing" ? "spin" : ""} />
      {statusLabels[status] || status}
    </span>
  );
}

export default function DrillsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [sport, setSport] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const { data, loading, refetch } = useFetch(
    () => getDrills({ page, sport: sport || undefined, starred: starredOnly || undefined }),
    [page, sport, starredOnly]
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
    const iv = setInterval(() => { if (!cancelled) { poll(); refetch(); } }, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [hasActive, refetch]);

  const handleDelete = async (id) => {
    if (!window.confirm(t("drills.deleteDrill"))) return;
    await deleteDrill(id);
    refetch();
  };

  const handleStar = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleStar(id);
    refetch();
  };

  const queueTotal = queue?.total || 0;
  const queueDone = (queue?.completed || 0) + (queue?.failed || 0);
  const queuePct = queueTotal > 0 ? Math.round((queueDone / queueTotal) * 100) : 0;

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{t("drills.title")}</h1>
        <Link to="/drills/new" className="btn btn-primary"><FiPlus /> {t("drills.newDrill")}</Link>
      </div>

      {/* Global embedding progress bar */}
      {hasActive && queueTotal > 0 && (
        <div className="embedding-progress mb-1">
          <div className="embedding-progress-header">
            <FiLoader className="spin" />
            <span>{t("drills.indexingProgress", { done: queueDone, total: queueTotal })}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${queuePct}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-sm mb-1" style={{ alignItems: "center" }}>
        <input
          className="form-control"
          placeholder={t("drills.filterBySport")}
          style={{ maxWidth: 200 }}
          value={sport}
          onChange={(e) => { setSport(e.target.value); setPage(1); }}
        />
        <button
          className={`btn btn-sm ${starredOnly ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setStarredOnly(!starredOnly); setPage(1); }}
        >
          <FiStar /> {starredOnly ? t("drills.starred") : t("drills.all")}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <>
          {data?.drills?.length ? (
            <div className="drill-grid">
              {data.drills.map((d) => (
                <Link key={d._id} to={`/drills/${d._id}`} className="drill-card card">
                  <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1rem", margin: 0 }}>{d.title}</h3>
                    <div className="flex gap-sm" style={{ alignItems: "center" }}>
                      <button
                        className={`star-btn ${d.isStarred ? "star-btn-active" : ""}`}
                        onClick={(e) => handleStar(e, d._id)}
                        title={d.isStarred ? t("drills.unstar") : t("drills.star")}
                      >
                        <FiStar />
                      </button>
                      <span className={`tag tag-${d.intensity === "high" ? "danger" : d.intensity === "low" ? "" : "warning"}`}>
                        {d.intensity}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted" style={{ marginBottom: "0.75rem", lineHeight: 1.4 }}>
                    {d.description?.slice(0, 120)}{d.description?.length > 120 ? "..." : ""}
                  </p>
                  <div className="flex gap-sm" style={{ flexWrap: "wrap", alignItems: "center" }}>
                    {d.sport && <span className="tag">{d.sport}</span>}
                    {d.setup?.duration && <span className="tag">{d.setup.duration}</span>}
                    {d.createdBy?.name && (
                      <span className="tag tag-creator"><FiUser style={{ fontSize: "0.7rem" }} /> {d.createdBy.name}</span>
                    )}
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
              <p className="text-muted">
                {starredOnly ? t("drills.noStarredDrills") : t("drills.noDrillsEmpty")}
              </p>
              {!starredOnly && <Link to="/drills/new" className="btn btn-primary mt-1"><FiPlus /> {t("drills.createDrill")}</Link>}
            </div>
          )}

          <Pagination page={data?.page} pages={data?.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
