import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlan, createPlan, updatePlan } from "../api/plans";
import { getTaxonomy } from "../api/taxonomy";

const EMPTY_PLAN = {
  title: "",
  sport: "",
  startDate: "",
  endDate: "",
  focusBlocks: [],
  weeklyPlans: [],
};

export default function PlanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_PLAN);
  const [taxonomyItems, setTaxonomyItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTaxonomy({}).then((res) => setTaxonomyItems(res.data));
    if (isEdit) {
      getPlan(id).then((res) => {
        const p = res.data;
        setForm({
          title: p.title || "",
          sport: p.sport || "",
          startDate: p.startDate ? p.startDate.slice(0, 10) : "",
          endDate: p.endDate ? p.endDate.slice(0, 10) : "",
          focusBlocks: (p.focusBlocks || []).map((fb) => ({
            ...fb,
            tags: fb.tags?.map((t) => t._id || t) || [],
          })),
          weeklyPlans: p.weeklyPlans || [],
        });
      });
    }
  }, [id, isEdit]);

  const addFocusBlock = () => {
    setForm({
      ...form,
      focusBlocks: [
        ...form.focusBlocks,
        { name: "", tags: [], startWeek: 1, endWeek: 4, priority: "primary" },
      ],
    });
  };

  const updateBlock = (idx, field, value) => {
    const updated = [...form.focusBlocks];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, focusBlocks: updated });
  };

  const removeBlock = (idx) => {
    setForm({ ...form, focusBlocks: form.focusBlocks.filter((_, i) => i !== idx) });
  };

  const addWeeklyPlan = () => {
    const nextWeek = form.weeklyPlans.length + 1;
    setForm({
      ...form,
      weeklyPlans: [...form.weeklyPlans, { week: nextWeek, sessions: [], observationNotes: "" }],
    });
  };

  const updateWeek = (idx, field, value) => {
    const updated = [...form.weeklyPlans];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, weeklyPlans: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit) {
        await updatePlan(id, form);
      } else {
        await createPlan(form);
      }
      navigate("/plans");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{isEdit ? "Edit Plan" : "New Period Plan"}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Plan Info</h3>
          <div className="form-group">
            <label>Title *</label>
            <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Sport</label>
              <input className="form-control" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
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

        {/* Focus Blocks */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Focus Blocks</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addFocusBlock}>+ Add Block</button>
          </div>
          {form.focusBlocks.map((block, i) => (
            <div key={i} className="card mb-1" style={{ background: "var(--color-bg)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.5rem", alignItems: "end" }}>
                <div className="form-group">
                  <label>Name</label>
                  <input className="form-control" value={block.name} onChange={(e) => updateBlock(i, "name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Start Week</label>
                  <input className="form-control" type="number" min={1} value={block.startWeek} onChange={(e) => updateBlock(i, "startWeek", parseInt(e.target.value, 10))} />
                </div>
                <div className="form-group">
                  <label>End Week</label>
                  <input className="form-control" type="number" min={1} value={block.endWeek} onChange={(e) => updateBlock(i, "endWeek", parseInt(e.target.value, 10))} />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-control" value={block.priority} onChange={(e) => updateBlock(i, "priority", e.target.value)}>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBlock(i)}>&times;</button>
              </div>
              <div className="form-group">
                <label>Tags</label>
                <select className="form-control" onChange={(e) => {
                  if (e.target.value && !block.tags.includes(e.target.value)) {
                    updateBlock(i, "tags", [...block.tags, e.target.value]);
                  }
                  e.target.value = "";
                }}>
                  <option value="">+ Add tag...</option>
                  {taxonomyItems.map((t) => <option key={t._id} value={t._id}>{t.category}: {t.name}</option>)}
                </select>
                <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
                  {block.tags.map((tagId, ti) => {
                    const item = taxonomyItems.find((t) => t._id === tagId);
                    return (
                      <span key={ti} className="tag" style={{ cursor: "pointer" }} onClick={() => updateBlock(i, "tags", block.tags.filter((_, j) => j !== ti))}>
                        {item?.name || tagId} &times;
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Plans */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Weekly Plans</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addWeeklyPlan}>+ Add Week</button>
          </div>
          {form.weeklyPlans.map((week, i) => (
            <div key={i} className="section-block">
              <h4>Week {week.week}</h4>
              <div className="form-group">
                <label>Observation Notes</label>
                <textarea className="form-control" value={week.observationNotes} onChange={(e) => updateWeek(i, "observationNotes", e.target.value)} style={{ minHeight: 50 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update Plan" : "Create Plan"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/plans")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
