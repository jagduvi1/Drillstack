import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getPlans, deletePlan } from "../api/plans";
import { FiPlus, FiCalendar, FiTrash2, FiEdit } from "react-icons/fi";

export default function PlansPage() {
  const { data: plans, loading, refetch } = useFetch(() => getPlans());

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    await deletePlan(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Training Programs</h1>
        <Link to="/plans/new" className="btn btn-primary"><FiPlus /> New Program</Link>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : plans?.length ? (
        <div className="drill-grid">
          {plans.map((p) => {
            const totalSessions = p.weeklyPlans?.reduce(
              (sum, w) => sum + (w.sessions?.length || 0), 0
            ) || 0;
            return (
              <Link key={p._id} to={`/plans/${p._id}`} className="drill-card card">
                <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>{p.title}</h3>
                  {p.sport && <span className="tag">{p.sport}</span>}
                </div>

                {p.description && (
                  <p className="text-sm text-muted" style={{ marginBottom: "0.75rem", lineHeight: 1.4 }}>
                    {p.description.slice(0, 120)}{p.description.length > 120 ? "..." : ""}
                  </p>
                )}

                <div className="flex gap-sm" style={{ flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  <span className="tag">
                    {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                  </span>
                  <span className="tag">{p.weeklyPlans?.length || 0} weeks</span>
                  {totalSessions > 0 && <span className="tag">{totalSessions} sessions</span>}
                  {p.sessionsPerWeek && <span className="tag">{p.sessionsPerWeek}x/wk</span>}
                </div>

                {p.focusAreas?.length > 0 && (
                  <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                    {p.focusAreas.slice(0, 3).map((a, i) => (
                      <span key={i} className="tag" style={{ background: "#e0e7ff", color: "#3730a3" }}>{a}</span>
                    ))}
                    {p.focusAreas.length > 3 && <span className="text-muted text-sm">+{p.focusAreas.length - 3}</span>}
                  </div>
                )}

                <div className="drill-card-actions" onClick={(e) => e.preventDefault()}>
                  <Link to={`/plans/${p._id}/edit`} className="btn btn-secondary btn-sm"><FiEdit /></Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <FiCalendar style={{ fontSize: "2rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
          <p className="text-muted">No training programs yet. Create your first one to get started.</p>
          <Link to="/plans/new" className="btn btn-primary mt-1"><FiPlus /> Create Program</Link>
        </div>
      )}
    </div>
  );
}
