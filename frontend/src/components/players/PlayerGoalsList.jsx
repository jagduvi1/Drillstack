import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createPlayerGoal, updatePlayerGoal, deletePlayerGoal } from "../../api/players";
import { FiPlus, FiTrash2, FiCheck, FiTarget } from "react-icons/fi";

export default function PlayerGoalsList({ groupId, playerId, goals: initialGoals, metricKeys }) {
  const { t } = useTranslation();
  const [goals, setGoals] = useState(initialGoals || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", metric: "", targetValue: "", targetDate: "" });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const res = await createPlayerGoal(groupId, playerId, {
        title: form.title,
        metric: form.metric || undefined,
        targetValue: form.targetValue ? parseInt(form.targetValue, 10) : undefined,
        targetDate: form.targetDate || undefined,
      });
      setGoals((prev) => [res.data, ...prev]);
      setForm({ title: "", metric: "", targetValue: "", targetDate: "" });
      setShowForm(false);
    } catch { /* ignore */ }
  };

  const handleStatus = async (goalId, status) => {
    try {
      const res = await updatePlayerGoal(groupId, playerId, goalId, { status });
      setGoals((prev) => prev.map((g) => g._id === goalId ? res.data : g));
    } catch { /* ignore */ }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm(t("common.delete") + "?")) return;
    try {
      await deletePlayerGoal(groupId, playerId, goalId);
      setGoals((prev) => prev.filter((g) => g._id !== goalId));
    } catch { /* ignore */ }
  };

  const progress = (g) => {
    if (!g.targetValue || !g.startValue) return null;
    const current = g.currentValue ?? g.startValue;
    const range = g.targetValue - g.startValue;
    if (range === 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((current - g.startValue) / range) * 100)));
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }}><FiTarget /> {t("playerProfile.goals")}</h4>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(!showForm)}>
          <FiPlus /> {t("playerProfile.addGoal")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="goal-form card" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
          <input className="form-control form-control-sm" placeholder={t("playerProfile.goalTitle")}
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="flex gap-sm" style={{ marginTop: "0.5rem" }}>
            <select className="form-control form-control-sm" value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })} style={{ width: "auto" }}>
              <option value="">{t("playerProfile.noMetric")}</option>
              {(metricKeys || []).map((k) => <option key={k} value={k}>{t(`metrics.${k}`, k)}</option>)}
            </select>
            <input type="number" className="form-control form-control-sm" placeholder={t("playerProfile.targetValue")}
              value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
              min={0} max={100} style={{ width: 80 }} />
            <input type="date" className="form-control form-control-sm"
              value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
            {t("common.create")}
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-muted">{t("playerProfile.noGoals")}</p>
      ) : (
        <div className="goals-list">
          {goals.map((g) => {
            const pct = progress(g);
            const isPast = g.targetDate && new Date(g.targetDate) < new Date();
            return (
              <div key={g._id} className={`goal-item ${g.status !== "active" ? "goal-done" : ""}`}>
                <div className="flex-between">
                  <strong className="text-sm">{g.title}</strong>
                  <div className="flex gap-sm">
                    {g.status === "active" && (
                      <button className="btn btn-sm" style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem" }}
                        onClick={() => handleStatus(g._id, "achieved")} title={t("playerProfile.markAchieved")}>
                        <FiCheck />
                      </button>
                    )}
                    <button className="btn btn-sm" style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem", color: "var(--color-danger)" }}
                      onClick={() => handleDelete(g._id)}><FiTrash2 /></button>
                  </div>
                </div>
                {g.metric && <span className="tag" style={{ fontSize: "0.65rem" }}>{t(`metrics.${g.metric}`, g.metric)}</span>}
                {g.targetDate && (
                  <span className={`tag ${isPast && g.status === "active" ? "tag-danger" : ""}`} style={{ fontSize: "0.65rem" }}>
                    {new Date(g.targetDate).toLocaleDateString()}
                  </span>
                )}
                {g.status !== "active" && <span className="tag" style={{ fontSize: "0.65rem" }}>{g.status}</span>}
                {pct !== null && (
                  <div className="goal-progress">
                    <div className="goal-progress-bar" style={{ width: `${pct}%` }} />
                    <span className="goal-progress-text">{pct}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
