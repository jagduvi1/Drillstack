import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getPlans, deletePlan } from "../api/plans";
import { FiPlus, FiCalendar, FiTrash2, FiEdit } from "react-icons/fi";

export default function PlansPage() {
  const { t } = useTranslation();
  const { data: plans, loading, refetch } = useFetch(() => getPlans());

  const handleDelete = async (id) => {
    if (!window.confirm(t("plans.deletePlan"))) return;
    await deletePlan(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{t("plans.title")}</h1>
        <Link to="/plans/new" className="btn btn-primary"><FiPlus /> {t("plans.newPlan")}</Link>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : plans?.length ? (
        <div className="drill-grid">
          {plans.map((p) => (
            <Link key={p._id} to={`/plans/${p._id}`} className="drill-card card">
              <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", margin: 0 }}>{p.name}</h3>
                {p.sport && <span className="tag">{p.sport}</span>}
              </div>

              {p.objective && (
                <p className="text-sm text-muted" style={{ marginBottom: "0.75rem", lineHeight: 1.4 }}>
                  {p.objective.slice(0, 120)}{p.objective.length > 120 ? "..." : ""}
                </p>
              )}

              <div className="flex gap-sm" style={{ flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <span className="tag">
                  {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                </span>
                {p.phases?.length > 0 && (
                  <span className="tag">{t("plans.phaseCount", { count: p.phases.length })}</span>
                )}
              </div>

              {p.phases?.length > 0 && (
                <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                  {p.phases.slice(0, 3).map((phase) => (
                    <span key={phase._id} className="tag" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                      {phase.name}
                    </span>
                  ))}
                  {p.phases.length > 3 && <span className="text-muted text-sm">+{p.phases.length - 3}</span>}
                </div>
              )}

              {p.followers?.length > 0 && (
                <div className="flex gap-sm mt-sm" style={{ flexWrap: "wrap" }}>
                  {p.followers.map((f) => (
                    <span key={f._id || f} className="tag" style={{ background: "#fef3c7", color: "#92400e", fontSize: "0.75rem" }}>
                      {f.name || t("plans.team")}
                    </span>
                  ))}
                </div>
              )}

              <div className="drill-card-actions" onClick={(e) => e.preventDefault()}>
                <Link to={`/plans/${p._id}/edit`} className="btn btn-secondary btn-sm"><FiEdit /></Link>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <FiCalendar style={{ fontSize: "2rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
          <p className="text-muted">{t("plans.noPlans")}</p>
          <Link to="/plans/new" className="btn btn-primary mt-1"><FiPlus /> {t("plans.createPlan")}</Link>
        </div>
      )}
    </div>
  );
}
