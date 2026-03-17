import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPlan, createPlan, updatePlan } from "../api/plans";
import SessionPickerModal from "../components/plans/SessionPickerModal";
import { useGroups } from "../context/GroupContext";
import { FiPlus, FiTrash2, FiSave, FiX, FiCalendar, FiChevronDown, FiChevronUp } from "react-icons/fi";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function PlanFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { groups, activeGroupId } = useGroups();
  const DAYS = DAY_KEYS.map((k) => t(`days.${k}`));

  const [form, setForm] = useState({
    title: "",
    description: "",
    sport: "",
    startDate: "",
    endDate: "",
    goals: [],
    focusAreas: [],
    weeklyPlans: [{ week: 1, theme: "", sessions: [], notes: "" }],
    group: activeGroupId || "",
    visibility: activeGroupId ? "group" : "private",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newFocus, setNewFocus] = useState("");
  const [showExtras, setShowExtras] = useState(false);

  // Session picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // { weekIdx }

  useEffect(() => {
    if (isEdit) {
      getPlan(id).then((res) => {
        const p = res.data;
        setForm({
          title: p.title || "",
          description: p.description || "",
          sport: p.sport || "",
          startDate: p.startDate ? p.startDate.slice(0, 10) : "",
          endDate: p.endDate ? p.endDate.slice(0, 10) : "",
          goals: p.goals || [],
          focusAreas: p.focusAreas || [],
          group: p.group || "",
          visibility: p.visibility || "private",
          weeklyPlans: (p.weeklyPlans || []).map((w) => ({
            ...w,
            sessions: (w.sessions || []).map((s) => ({
              dayOfWeek: s.dayOfWeek || "",
              session: s.session?._id || s.session,
              _sessionTitle: s.session?.title || "",
              _sessionDuration: s.session?.totalDuration || 0,
              _sessionSport: s.session?.sport || "",
              notes: s.notes || "",
            })),
          })),
        });
        // Show extras section if any goals/focusAreas exist
        if ((p.goals && p.goals.length > 0) || (p.focusAreas && p.focusAreas.length > 0)) {
          setShowExtras(true);
        }
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        group: form.group || null,
        visibility: form.group ? form.visibility : "private",
        weeklyPlans: form.weeklyPlans.map((w) => ({
          ...w,
          sessions: w.sessions.map(({ _sessionTitle, _sessionDuration, _sessionSport, ...rest }) => rest),
        })),
      };
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

  // Week helpers
  const addWeek = () => {
    setForm({
      ...form,
      weeklyPlans: [
        ...form.weeklyPlans,
        { week: form.weeklyPlans.length + 1, theme: "", sessions: [], notes: "" },
      ],
    });
  };

  const removeWeek = (wi) => {
    if (form.weeklyPlans.length <= 1) return; // Keep at least one week
    const updated = form.weeklyPlans.filter((_, j) => j !== wi).map((w, i) => ({ ...w, week: i + 1 }));
    setForm({ ...form, weeklyPlans: updated });
  };

  const updateWeek = (wi, field, value) => {
    const updated = [...form.weeklyPlans];
    updated[wi] = { ...updated[wi], [field]: value };
    setForm({ ...form, weeklyPlans: updated });
  };

  // Session helpers
  const openSessionPicker = (weekIdx) => {
    setPickerTarget({ weekIdx });
    setPickerOpen(true);
  };

  const handlePickSession = (session) => {
    if (!pickerTarget) return;
    const { weekIdx } = pickerTarget;
    const weeks = [...form.weeklyPlans];
    weeks[weekIdx] = {
      ...weeks[weekIdx],
      sessions: [
        ...(weeks[weekIdx].sessions || []),
        {
          dayOfWeek: "",
          session: session._id,
          _sessionTitle: session.title,
          _sessionDuration: session.totalDuration || 0,
          _sessionSport: session.sport || "",
          notes: "",
        },
      ],
    };
    setForm({ ...form, weeklyPlans: weeks });
    setPickerOpen(false);
    setPickerTarget(null);
  };

  const removeSessionFromWeek = (wi, si) => {
    const weeks = [...form.weeklyPlans];
    weeks[wi] = {
      ...weeks[wi],
      sessions: weeks[wi].sessions.filter((_, j) => j !== si),
    };
    setForm({ ...form, weeklyPlans: weeks });
  };

  const updateSessionField = (wi, si, field, value) => {
    const weeks = [...form.weeklyPlans];
    const sessions = [...weeks[wi].sessions];
    sessions[si] = { ...sessions[si], [field]: value };
    weeks[wi] = { ...weeks[wi], sessions };
    setForm({ ...form, weeklyPlans: weeks });
  };

  const totalSessions = form.weeklyPlans.reduce((sum, w) => sum + (w.sessions?.length || 0), 0);

  return (
    <div>
      <h1>{isEdit ? t("plans.editPlan") : t("plans.createPlan")}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>{t("plans.planInfo")}</h3>
          <div className="form-group">
            <label>{t("drills.titleRequired")}</label>
            <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("plans.titlePlaceholder")} />
          </div>
          <div className="form-group">
            <label>{t("sessions.description")}</label>
            <textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 60 }} placeholder={t("plans.descriptionPlaceholder")} />
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

          {/* Sharing controls */}
          {groups.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{t("sessions.shareWith")}</label>
                <select className="form-control" value={form.group || ""}
                  onChange={(e) => setForm({ ...form, group: e.target.value || "", visibility: e.target.value ? "group" : "private" })}>
                  <option value="">{t("sessions.privateOnly")}</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}{g.parentClub?.name ? ` (${g.parentClub.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {form.group && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{t("plans.visibleTo")}</label>
                  <span className="text-sm text-muted" style={{ display: "block", padding: "0.5rem 0" }}>
                    {t("plans.trainersAndAdmins")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Goals & Focus */}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowExtras(!showExtras)} style={{ marginTop: "0.5rem" }}>
            {showExtras ? <FiChevronUp /> : <FiChevronDown />} {t("plans.goalsAndFocus")}
          </button>

          {showExtras && (
            <div style={{ marginTop: "1rem" }}>
              {/* Goals */}
              <div style={{ marginBottom: "1rem" }}>
                <label className="text-sm" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>{t("plans.goals")}</label>
                <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
                  {form.goals.map((g, i) => (
                    <span key={i} className="tag" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, goals: form.goals.filter((_, j) => j !== i) })}>
                      {g} &times;
                    </span>
                  ))}
                </div>
                <div className="flex gap-sm">
                  <input className="form-control" placeholder={t("plans.goalPlaceholder")} value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newGoal.trim()) { setForm({ ...form, goals: [...form.goals, newGoal.trim()] }); setNewGoal(""); } } }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newGoal.trim()) { setForm({ ...form, goals: [...form.goals, newGoal.trim()] }); setNewGoal(""); } }}><FiPlus /></button>
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="text-sm" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>{t("plans.focusAreas")}</label>
                <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
                  {form.focusAreas.map((area, i) => (
                    <span key={i} className="tag" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, focusAreas: form.focusAreas.filter((_, j) => j !== i) })}>
                      {area} &times;
                    </span>
                  ))}
                </div>
                <div className="flex gap-sm">
                  <input className="form-control" placeholder={t("plans.focusPlaceholder")} value={newFocus} onChange={(e) => setNewFocus(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newFocus.trim()) { setForm({ ...form, focusAreas: [...form.focusAreas, newFocus.trim()] }); setNewFocus(""); } } }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newFocus.trim()) { setForm({ ...form, focusAreas: [...form.focusAreas, newFocus.trim()] }); setNewFocus(""); } }}><FiPlus /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Schedule — this is the main section */}
        {form.weeklyPlans.map((week, wi) => (
          <div key={wi} className="card mb-1">
            <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
              <h3>
                {form.weeklyPlans.length === 1 ? t("plans.trainingSchedule") : t("plans.week", { number: week.week })}
                {week.theme ? ` — ${week.theme}` : ""}
              </h3>
              <div className="flex gap-sm">
                {form.weeklyPlans.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeWeek(wi)}><FiTrash2 /></button>
                )}
              </div>
            </div>

            {form.weeklyPlans.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="text-sm">{t("plans.theme")}</label>
                  <input className="form-control" placeholder={t("plans.themePlaceholder")} value={week.theme || ""} onChange={(e) => updateWeek(wi, "theme", e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="text-sm">{t("plans.notesLabel")}</label>
                  <input className="form-control" placeholder={t("plans.notesPlaceholder")} value={week.notes || ""} onChange={(e) => updateWeek(wi, "notes", e.target.value)} />
                </div>
              </div>
            )}

            {/* Sessions list */}
            {(week.sessions || []).map((sess, si) => (
              <div key={si} className="plan-session-entry" style={{
                background: "var(--color-bg)",
                borderRadius: "var(--radius)",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                border: "1px solid var(--color-border)",
              }}>
                <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                  <strong style={{ fontSize: "0.95rem" }}>
                    <FiCalendar style={{ fontSize: "0.8rem", marginRight: "0.25rem" }} />
                    {sess._sessionTitle || "Session"}
                  </strong>
                  <div className="flex gap-sm" style={{ alignItems: "center" }}>
                    {sess._sessionSport && <span className="tag">{sess._sessionSport}</span>}
                    {sess._sessionDuration > 0 && <span className="tag">{sess._sessionDuration} min</span>}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSessionFromWeek(wi, si)} title={t("plans.removeSession")}><FiTrash2 /></button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "0.5rem" }}>
                  <select className="form-control" value={sess.dayOfWeek || ""} onChange={(e) => updateSessionField(wi, si, "dayOfWeek", e.target.value)}>
                    <option value="">{t("plans.selectDay")}</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input className="form-control" placeholder={t("plans.sessionNotes")} value={sess.notes || ""} onChange={(e) => updateSessionField(wi, si, "notes", e.target.value)} />
                </div>
              </div>
            ))}

            {/* ADD SESSION — the primary action */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openSessionPicker(wi)}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1rem",
                marginTop: (week.sessions || []).length > 0 ? "0.5rem" : 0,
              }}
            >
              <FiPlus /> {t("plans.selectSession")}
            </button>

            {(week.sessions || []).length === 0 && (
              <p className="text-sm text-muted" style={{ textAlign: "center", marginTop: "0.5rem" }}>
                {t("plans.pickSessionHint")}
              </p>
            )}
          </div>
        ))}

        {/* Add another week */}
        <button type="button" className="btn btn-secondary" onClick={addWeek} style={{ width: "100%", marginBottom: "1rem" }}>
          <FiPlus /> {t("plans.addAnotherWeek")}
        </button>

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? t("common.saving") : isEdit ? t("plans.updatePlan") : t("plans.savePlan")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/plans")}><FiX /> {t("common.cancel")}</button>
          {totalSessions > 0 && (
            <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
              {t("plans.session", { count: totalSessions })} — {t("plans.weeks", { count: form.weeklyPlans.length })}
            </span>
          )}
        </div>
      </form>

      {/* Session picker modal */}
      {pickerOpen && (
        <SessionPickerModal
          onSelect={handlePickSession}
          onClose={() => { setPickerOpen(false); setPickerTarget(null); }}
          sport={form.sport || undefined}
        />
      )}
    </div>
  );
}
