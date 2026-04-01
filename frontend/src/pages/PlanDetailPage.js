import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getPlan, deletePlan } from "../api/plans";
import { FiEdit, FiTrash2, FiCalendar } from "react-icons/fi";

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

  const totalSessions = plan.weeklyPlans?.reduce(
    (sum, w) => sum + (w.sessions?.length || 0),
    0
  ) || 0;

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{plan.title}</h1>
        <div className="flex gap-sm">
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
          <span className="tag">{t("plans.weeks", { count: plan.weeklyPlans?.length || 0 })}</span>
          <span className="tag">{t("plans.session", { count: totalSessions })}</span>
        </div>
        {plan.description && (
          <p style={{ marginTop: "0.75rem" }}>{plan.description}</p>
        )}
      </div>

      {/* Goals */}
      {plan.goals?.length > 0 && (
        <div className="card mb-1">
          <h3>{t("plans.goals")}</h3>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            {plan.goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {/* Focus Areas */}
      {plan.focusAreas?.length > 0 && (
        <div className="card mb-1">
          <h3>{t("plans.focusAreas")}</h3>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {plan.focusAreas.map((area, i) => (
              <span key={i} className="tag">{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Plans */}
      {plan.weeklyPlans?.length > 0 && plan.weeklyPlans.map((w, wi) => (
        <div key={wi} className="card mb-1">
          <div className="flex-between">
            <h3>{t("plans.week", { number: w.week })}{w.theme ? ` — ${w.theme}` : ""}</h3>
            <span className="text-sm text-muted">{t("plans.session", { count: w.sessions?.length || 0 })}</span>
          </div>
          {w.notes && <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{w.notes}</p>}

          {w.sessions?.length > 0 && (
            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
              {w.sessions.map((entry, si) => {
                const sess = entry.linkedSession;
                return (
                  <div key={si} style={{ background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                    <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
                      <strong className="text-sm">
                        <FiCalendar style={{ fontSize: "0.75rem" }} />{" "}
                        {entry.dayOfWeek ? `${entry.dayOfWeek}: ` : ""}
                        {sess?.title || "Session"}
                      </strong>
                      <div className="flex gap-sm">
                        {sess?.sport && <span className="tag">{sess.sport}</span>}
                        {sess?.totalDuration > 0 && <span className="tag">{sess.totalDuration} min</span>}
                      </div>
                    </div>
                    {sess?.description && (
                      <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                        {sess.description}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-sm" style={{ marginTop: "0.25rem", fontStyle: "italic" }}>
                        {entry.notes}
                      </p>
                    )}
                    {sess?._id && (
                      <Link to={`/sessions/${sess._id}`} className="text-sm" style={{ marginTop: "0.25rem", display: "inline-block" }}>
                        {t("plans.viewSessionDetails")}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
