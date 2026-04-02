import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFormDirty from "../hooks/useFormDirty";
import { getPlan, createPlan, updatePlan } from "../api/plans";
import { useGroups } from "../context/GroupContext";
import { FiPlus, FiTrash2, FiSave, FiX, FiChevronUp, FiChevronDown } from "react-icons/fi";

export default function PlanFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { groups } = useGroups();

  const [form, setForm] = useState({
    name: "",
    sport: "",
    startDate: "",
    endDate: "",
    objective: "",
    phases: [{ name: "", primaryFocus: "", secondaryFocus: "", description: "", order: 0 }],
    followers: [],
    visibility: "private",
  });
  const [dirty, setDirty, markLoaded] = useFormDirty(form);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      getPlan(id).then((res) => {
        const p = res.data;
        setForm({
          name: p.name || "",
          sport: p.sport || "",
          startDate: p.startDate ? p.startDate.slice(0, 10) : "",
          endDate: p.endDate ? p.endDate.slice(0, 10) : "",
          objective: p.objective || "",
          phases: p.phases?.length
            ? p.phases.map((ph) => ({
                name: ph.name || "",
                primaryFocus: ph.primaryFocus || "",
                secondaryFocus: ph.secondaryFocus || "",
                description: ph.description || "",
                order: ph.order || 0,
              }))
            : [{ name: "", primaryFocus: "", secondaryFocus: "", description: "", order: 0 }],
          followers: (p.followers || []).map((f) => f._id || f),
          visibility: p.visibility || "private",
        });
        markLoaded();
      });
    } else {
      markLoaded();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        phases: form.phases.map((ph, i) => ({ ...ph, order: i })),
        visibility: form.followers.length > 0 ? "group" : "private",
      };
      setDirty(false);
      if (isEdit) {
        await updatePlan(id, payload);
      } else {
        await createPlan(payload);
      }
      navigate("/plans");
    } catch (err) {
      setError(err.response?.data?.error || t("common.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Phase helpers
  const addPhase = () => {
    setForm({
      ...form,
      phases: [...form.phases, { name: "", primaryFocus: "", secondaryFocus: "", description: "", order: form.phases.length }],
    });
  };

  const removePhase = (idx) => {
    if (form.phases.length <= 1) return;
    setForm({ ...form, phases: form.phases.filter((_, i) => i !== idx) });
  };

  const updatePhase = (idx, field, value) => {
    const updated = [...form.phases];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, phases: updated });
  };

  const movePhase = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= form.phases.length) return;
    const updated = [...form.phases];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setForm({ ...form, phases: updated });
  };

  const toggleFollower = (groupId) => {
    const exists = form.followers.includes(groupId);
    setForm({
      ...form,
      followers: exists
        ? form.followers.filter((f) => f !== groupId)
        : [...form.followers, groupId],
    });
  };

  return (
    <div>
      <h1>{isEdit ? t("plans.editPlan") : t("plans.createPlan")}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>{t("plans.planInfo")}</h3>
          <div className="form-group">
            <label>{t("plans.name")}</label>
            <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("plans.namePlaceholder")} />
          </div>
          <div className="form-group">
            <label>{t("plans.objective")}</label>
            <textarea className="form-control" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} style={{ minHeight: 60 }} placeholder={t("plans.objectivePlaceholder")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>{t("drills.sport")}</label>
              <input className="form-control" placeholder={t("drills.sportEg")} value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t("plans.startDate")}</label>
              <input className="form-control" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t("plans.endDate")}</label>
              <input className="form-control" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>

          {/* Follower groups */}
          {groups.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>{t("plans.followers")}</label>
              <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                {groups.map((g) => (
                  <button
                    key={g._id}
                    type="button"
                    className={`tag ${form.followers.includes(g._id) ? "" : "tag-outline"}`}
                    style={{
                      cursor: "pointer",
                      background: form.followers.includes(g._id) ? "#dbeafe" : undefined,
                      color: form.followers.includes(g._id) ? "#1e40af" : undefined,
                      border: form.followers.includes(g._id) ? "1px solid #93c5fd" : undefined,
                    }}
                    onClick={() => toggleFollower(g._id)}
                  >
                    {g.name}{g.parentClub?.name ? ` (${g.parentClub.name})` : ""}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                {t("plans.followersHint")}
              </p>
            </div>
          )}
        </div>

        {/* Phases */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>{t("plans.phases")}</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>{t("plans.phasesDescription")}</p>

          {form.phases.map((phase, pi) => (
            <div key={pi} style={{
              background: "var(--color-bg)",
              borderRadius: "var(--radius)",
              padding: "1rem",
              marginBottom: "0.75rem",
              border: "1px solid var(--color-border)",
            }}>
              <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
                <strong>{t("plans.phase")} {pi + 1}</strong>
                <div className="flex gap-sm">
                  {pi > 0 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => movePhase(pi, -1)}><FiChevronUp /></button>
                  )}
                  {pi < form.phases.length - 1 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => movePhase(pi, 1)}><FiChevronDown /></button>
                  )}
                  {form.phases.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removePhase(pi)}><FiTrash2 /></button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm">{t("plans.phaseName")}</label>
                <input className="form-control" required value={phase.name} onChange={(e) => updatePhase(pi, "name", e.target.value)} placeholder={t("plans.phaseNamePlaceholder")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="text-sm">{t("plans.primaryFocus")}</label>
                  <input className="form-control" required value={phase.primaryFocus} onChange={(e) => updatePhase(pi, "primaryFocus", e.target.value)} placeholder={t("plans.primaryFocusPlaceholder")} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="text-sm">{t("plans.secondaryFocus")}</label>
                  <input className="form-control" value={phase.secondaryFocus} onChange={(e) => updatePhase(pi, "secondaryFocus", e.target.value)} placeholder={t("plans.secondaryFocusPlaceholder")} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                <label className="text-sm">{t("plans.phaseDescription")}</label>
                <textarea className="form-control" value={phase.description} onChange={(e) => updatePhase(pi, "description", e.target.value)} style={{ minHeight: 40 }} placeholder={t("plans.phaseDescriptionPlaceholder")} />
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-secondary" onClick={addPhase} style={{ width: "100%" }}>
            <FiPlus /> {t("plans.addPhase")}
          </button>
        </div>

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? t("common.saving") : isEdit ? t("plans.updatePlan") : t("plans.savePlan")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/plans")}><FiX /> {t("common.cancel")}</button>
          {form.phases.length > 0 && (
            <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
              {t("plans.phaseCount", { count: form.phases.length })}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
