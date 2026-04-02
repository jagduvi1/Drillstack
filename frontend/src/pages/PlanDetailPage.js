import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getPlan, deletePlan } from "../api/plans";
import MatchScoreBar from "../components/sessions/MatchScoreBar";
import { FiEdit, FiTrash2, FiPlus, FiTarget } from "react-icons/fi";

export default function PlanDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: plan, loading } = useFetch(() => getPlan(id), [id]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!plan) return <div className="alert alert-danger">{t("plans.notFound")}</div>;

  const handleDelete = async () => {
    if (!window.confirm(t("plans.deletePlan"))) return;
    await deletePlan(id);
    navigate("/plans");
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{plan.name}</h1>
        <div className="flex gap-sm">
          <Link to={`/sessions/new?plan=${id}`} className="btn btn-primary"><FiPlus /> {t("plans.newSession")}</Link>
          <Link to={`/plans/${id}/edit`} className="btn btn-secondary"><FiEdit /> {t("common.edit")}</Link>
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> {t("common.delete")}</button>
        </div>
      </div>

      {/* Overview */}
      <div className="card mb-1">
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          {plan.sport && <span className="tag">{plan.sport}</span>}
          <span className="tag">
            {new Date(plan.startDate).toLocaleDateString()} — {new Date(plan.endDate).toLocaleDateString()}
          </span>
          {plan.phases?.length > 0 && (
            <span className="tag">{t("plans.phaseCount", { count: plan.phases.length })}</span>
          )}
          {plan.sessions?.length > 0 && (
            <span className="tag">{t("plans.sessionCount", { count: plan.sessions.length })}</span>
          )}
        </div>
        {plan.objective && (
          <p style={{ marginTop: "0.75rem" }}>{plan.objective}</p>
        )}
        {plan.followers?.length > 0 && (
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            <span className="text-sm text-muted">{t("plans.followers")}:</span>
            {plan.followers.map((f) => (
              <span key={f._id || f} className="tag" style={{ background: "#fef3c7", color: "#92400e" }}>
                {f.name || t("plans.team")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phases */}
      {plan.phases?.length > 0 && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>{t("plans.phases")}</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {plan.phases.map((phase, pi) => (
              <div key={phase._id || pi} style={{
                background: "var(--color-bg)",
                borderRadius: "var(--radius)",
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
              }}>
                <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
                  <strong>
                    <FiTarget style={{ fontSize: "0.8rem", marginRight: "0.25rem" }} />
                    {phase.name}
                  </strong>
                </div>
                <div className="flex gap-sm" style={{ flexWrap: "wrap", marginBottom: phase.description ? "0.5rem" : 0 }}>
                  <span className="tag" style={{ background: "#dbeafe", color: "#1e40af" }}>
                    {t("plans.primary")}: {phase.primaryFocus}
                  </span>
                  {phase.secondaryFocus && (
                    <span className="tag" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                      {t("plans.secondary")}: {phase.secondaryFocus}
                    </span>
                  )}
                </div>
                {phase.description && (
                  <p className="text-sm text-muted">{phase.description}</p>
                )}

                {/* Sessions linked to this phase */}
                {plan.sessions?.filter((s) => s.phase?.toString() === phase._id?.toString()).length > 0 && (
                  <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
                    {plan.sessions
                      .filter((s) => s.phase?.toString() === phase._id?.toString())
                      .map((s) => (
                        <div key={s._id} className="flex-between" style={{ padding: "0.25rem 0" }}>
                          <Link to={`/sessions/${s._id}`} className="text-sm">{s.title}</Link>
                          <div className="flex gap-sm" style={{ alignItems: "center" }}>
                            {s.date && <span className="text-sm text-muted">{new Date(s.date).toLocaleDateString()}</span>}
                            {s.matchScore != null && (
                              <div style={{ width: 150 }}>
                                <MatchScoreBar score={s.matchScore} feedback={s.matchFeedback} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <Link
                  to={`/sessions/new?plan=${id}&phase=${phase._id}`}
                  className="text-sm"
                  style={{ marginTop: "0.5rem", display: "inline-block" }}
                >
                  <FiPlus style={{ fontSize: "0.75rem" }} /> {t("plans.createSessionForPhase")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions not linked to any phase */}
      {plan.sessions?.filter((s) => !s.phase).length > 0 && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>{t("plans.unlinkedSessions")}</h3>
          {plan.sessions
            .filter((s) => !s.phase)
            .map((s) => (
              <div key={s._id} className="flex-between" style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
                <Link to={`/sessions/${s._id}`}>{s.title}</Link>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  {s.date && <span className="text-sm text-muted">{new Date(s.date).toLocaleDateString()}</span>}
                  {s.totalDuration > 0 && <span className="tag">{s.totalDuration} min</span>}
                  {s.matchScore != null && (
                    <div style={{ width: 150 }}>
                      <MatchScoreBar score={s.matchScore} feedback={s.matchFeedback} />
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
