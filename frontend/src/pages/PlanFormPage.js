import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlan, createPlan, updatePlan } from "../api/plans";
import { generateProgram } from "../api/ai";
import DebugPanel from "../components/common/DebugPanel";
import { FiPlus, FiTrash2, FiZap, FiSave, FiX, FiCode } from "react-icons/fi";

const INTENSITY_COLORS = { high: "tag-danger", medium: "tag-warning", low: "" };

export default function PlanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    sport: "",
    startDate: "",
    endDate: "",
    sessionsPerWeek: 3,
    goals: [],
    focusAreas: [],
    weeklyPlans: [],
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [newFocus, setNewFocus] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState([]);

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
          sessionsPerWeek: p.sessionsPerWeek || 3,
          goals: p.goals || [],
          focusAreas: p.focusAreas || [],
          weeklyPlans: p.weeklyPlans || [],
        });
        setGenerated(true);
      });
    }
  }, [id, isEdit]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || !form.startDate || !form.endDate) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateProgram({
        description: aiPrompt,
        sport: form.sport || undefined,
        sessionsPerWeek: form.sessionsPerWeek,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      const prog = res.data.program;
      if (res.data.debug) {
        setDebugEntries((prev) => [
          ...prev,
          { label: "Program Generation", debug: res.data.debug },
        ]);
      }
      setForm((prev) => ({
        ...prev,
        title: prog.title || "",
        description: prog.description || aiPrompt,
        sport: prog.sport || prev.sport || "",
        goals: prog.goals || [],
        focusAreas: prog.focusAreas || [],
        weeklyPlans: prog.weeklyPlans || [],
      }));
      setGenerated(true);
    } catch (err) {
      setError(err.response?.data?.error || "AI generation failed. Check your AI provider config.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        aiConversation: !isEdit
          ? [
              { role: "user", content: aiPrompt || form.description },
              { role: "assistant", content: "Program created." },
            ]
          : undefined,
      };
      if (isEdit) {
        await updatePlan(id, form);
      } else {
        await createPlan(payload);
      }
      navigate("/plans");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const updateWeek = (wi, field, value) => {
    const updated = [...form.weeklyPlans];
    updated[wi] = { ...updated[wi], [field]: value };
    setForm({ ...form, weeklyPlans: updated });
  };

  const updateSession = (wi, si, field, value) => {
    const weeks = [...form.weeklyPlans];
    const sessions = [...(weeks[wi].sessions || [])];
    sessions[si] = { ...sessions[si], [field]: value };
    weeks[wi] = { ...weeks[wi], sessions };
    setForm({ ...form, weeklyPlans: weeks });
  };

  const addSession = (wi) => {
    const weeks = [...form.weeklyPlans];
    weeks[wi] = {
      ...weeks[wi],
      sessions: [
        ...(weeks[wi].sessions || []),
        { dayOfWeek: "", title: "", focus: "", intensity: "medium", durationMinutes: 60, notes: "" },
      ],
    };
    setForm({ ...form, weeklyPlans: weeks });
  };

  const removeSession = (wi, si) => {
    const weeks = [...form.weeklyPlans];
    weeks[wi] = {
      ...weeks[wi],
      sessions: weeks[wi].sessions.filter((_, j) => j !== si),
    };
    setForm({ ...form, weeklyPlans: weeks });
  };

  const addWeek = () => {
    setForm({
      ...form,
      weeklyPlans: [
        ...form.weeklyPlans,
        { week: form.weeklyPlans.length + 1, theme: "", sessions: [], notes: "" },
      ],
    });
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{isEdit ? "Edit Training Program" : "Create Training Program"}</h1>
        {debugEntries.length > 0 && (
          <button
            type="button"
            className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setDebugOpen(!debugOpen)}
          >
            <FiCode /> Debug ({debugEntries.length})
          </button>
        )}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {debugOpen && <DebugPanel entries={debugEntries} />}

      {/* AI generation prompt (new plans only) */}
      {!isEdit && !generated && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>Describe your training program</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
            Tell the AI what you want to achieve — how many sessions per week, what skills to develop,
            what phase of the season you're in. It will generate a full periodized plan.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Sport</label>
              <input className="form-control" placeholder="e.g. football" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sessions / week</label>
              <input className="form-control" type="number" min={1} max={14} value={form.sessionsPerWeek} onChange={(e) => setForm({ ...form, sessionsPerWeek: parseInt(e.target.value, 10) || 3 })} />
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input className="form-control" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input className="form-control" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>

          <textarea
            className="form-control"
            placeholder="e.g. 'Pre-season program for U17 football team. 4 sessions per week. Focus on building aerobic base, improving passing accuracy under pressure, and introducing our pressing system. Players returning from summer break with mixed fitness levels.'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            style={{ minHeight: 120 }}
          />
          <div className="flex gap-sm mt-1">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim() || !form.startDate || !form.endDate}
            >
              <FiZap /> {generating ? "Generating program..." : "Generate Program with AI"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setGenerated(true)}>
              Skip AI — build manually
            </button>
          </div>
        </div>
      )}

      {/* Full form (shown after generation or skip) */}
      {generated && (
        <form onSubmit={handleSubmit}>
          {/* Basic info */}
          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Program Info</h3>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Sport</label>
                <input className="form-control" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Sessions / week</label>
                <input className="form-control" type="number" min={1} max={14} value={form.sessionsPerWeek} onChange={(e) => setForm({ ...form, sessionsPerWeek: parseInt(e.target.value, 10) || 3 })} />
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input className="form-control" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input className="form-control" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Goals</h3>
            <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
              {form.goals.map((g, i) => (
                <span key={i} className="tag" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, goals: form.goals.filter((_, j) => j !== i) })}>
                  {g} &times;
                </span>
              ))}
            </div>
            <div className="flex gap-sm">
              <input className="form-control" placeholder="e.g. Improve aerobic capacity..." value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newGoal.trim()) { setForm({ ...form, goals: [...form.goals, newGoal.trim()] }); setNewGoal(""); } } }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newGoal.trim()) { setForm({ ...form, goals: [...form.goals, newGoal.trim()] }); setNewGoal(""); } }}><FiPlus /> Add</button>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Focus Areas</h3>
            <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
              {form.focusAreas.map((area, i) => (
                <span key={i} className="tag" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, focusAreas: form.focusAreas.filter((_, j) => j !== i) })}>
                  {area} &times;
                </span>
              ))}
            </div>
            <div className="flex gap-sm">
              <input className="form-control" placeholder="e.g. Passing under pressure, 1v1 defending..." value={newFocus} onChange={(e) => setNewFocus(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newFocus.trim()) { setForm({ ...form, focusAreas: [...form.focusAreas, newFocus.trim()] }); setNewFocus(""); } } }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newFocus.trim()) { setForm({ ...form, focusAreas: [...form.focusAreas, newFocus.trim()] }); setNewFocus(""); } }}><FiPlus /> Add</button>
            </div>
          </div>

          {/* Weekly Plans */}
          <div className="card mb-1">
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h3>Weekly Plans ({form.weeklyPlans.length} weeks)</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addWeek}><FiPlus /> Add Week</button>
            </div>

            {form.weeklyPlans.map((week, wi) => (
              <div key={wi} className="section-block" style={{ marginBottom: "1.5rem" }}>
                <div className="flex-between">
                  <h4>Week {week.week}{week.theme ? ` — ${week.theme}` : ""}</h4>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, weeklyPlans: form.weeklyPlans.filter((_, j) => j !== wi) })}><FiTrash2 /></button>
                </div>
                <div className="form-group">
                  <label>Theme</label>
                  <input className="form-control" placeholder="Weekly theme..." value={week.theme || ""} onChange={(e) => updateWeek(wi, "theme", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Week Notes</label>
                  <textarea className="form-control" value={week.notes || ""} onChange={(e) => updateWeek(wi, "notes", e.target.value)} style={{ minHeight: 40 }} />
                </div>

                {/* Sessions within week */}
                {(week.sessions || []).map((sess, si) => (
                  <div key={si} style={{ background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                      <strong className="text-sm">{sess.dayOfWeek || `Session ${si + 1}`}: {sess.title || "Untitled"}</strong>
                      <div className="flex gap-sm">
                        <span className={`tag ${INTENSITY_COLORS[sess.intensity] || ""}`}>{sess.intensity}</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSession(wi, si)}><FiTrash2 /></button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <input className="form-control" placeholder="Day" value={sess.dayOfWeek || ""} onChange={(e) => updateSession(wi, si, "dayOfWeek", e.target.value)} />
                      <input className="form-control" placeholder="Title" value={sess.title || ""} onChange={(e) => updateSession(wi, si, "title", e.target.value)} />
                      <select className="form-control" value={sess.intensity || "medium"} onChange={(e) => updateSession(wi, si, "intensity", e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input className="form-control" type="number" placeholder="min" value={sess.durationMinutes || 60} onChange={(e) => updateSession(wi, si, "durationMinutes", parseInt(e.target.value, 10) || 60)} />
                    </div>
                    <input className="form-control" placeholder="Focus..." value={sess.focus || ""} onChange={(e) => updateSession(wi, si, "focus", e.target.value)} style={{ marginBottom: "0.5rem" }} />
                    <textarea className="form-control" placeholder="Session notes..." value={sess.notes || ""} onChange={(e) => updateSession(wi, si, "notes", e.target.value)} style={{ minHeight: 40 }} />
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addSession(wi)}><FiPlus /> Add Session</button>
              </div>
            ))}
          </div>

          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FiSave /> {loading ? "Saving..." : isEdit ? "Update Program" : "Save Program"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/plans")}><FiX /> Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
