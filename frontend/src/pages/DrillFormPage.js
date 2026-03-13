import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDrill, createDrill, updateDrill } from "../api/drills";
import { getTaxonomy } from "../api/taxonomy";
import * as aiApi from "../api/ai";

const EMPTY_DRILL = {
  title: "",
  purpose: "",
  sport: "",
  intensity: "medium",
  duration: 15,
  tags: [],
  instructionFocus: { active: { taxonomy: null, description: "" }, history: [] },
  guidedQuestions: [],
  rules: [],
  successCriteria: [],
  variations: [],
  commonMistakes: [],
  space: { dimensions: "", shape: "", zones: [] },
  gameForm: { format: "", goalkeepers: false },
  equipment: [],
};

export default function DrillFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_DRILL);
  const [taxonomyItems, setTaxonomyItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState("");

  // New item inputs
  const [newQuestion, setNewQuestion] = useState("");
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    getTaxonomy({}).then((res) => setTaxonomyItems(res.data));
    if (isEdit) {
      getDrill(id).then((res) => {
        const d = res.data;
        setForm({
          ...EMPTY_DRILL,
          ...d,
          tags: d.tags?.map((t) => ({
            category: t.category,
            taxonomy: t.taxonomy?._id || t.taxonomy,
          })) || [],
          instructionFocus: {
            active: {
              taxonomy: d.instructionFocus?.active?.taxonomy?._id || d.instructionFocus?.active?.taxonomy || null,
              description: d.instructionFocus?.active?.description || "",
            },
            history: d.instructionFocus?.history || [],
          },
        });
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit) {
        await updateDrill(id, form);
      } else {
        await createDrill(form);
      }
      navigate("/drills");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const addTag = (category, taxonomyId) => {
    if (form.tags.some((t) => t.taxonomy === taxonomyId)) return;
    set("tags", [...form.tags, { category, taxonomy: taxonomyId }]);
  };

  const removeTag = (idx) => {
    set("tags", form.tags.filter((_, i) => i !== idx));
  };

  // ── AI helpers ──────────────────────────────────────────
  const aiSuggestTags = async () => {
    setAiLoading("tags");
    try {
      const res = await aiApi.suggestTags(`${form.title}. ${form.purpose}`);
      // Try to match suggested tags to existing taxonomy items
      const suggestions = res.data.tags || [];
      alert(`AI Suggestions:\n${suggestions.map((s) => `${s.category}: ${s.name}`).join("\n")}`);
    } catch { alert("AI tag suggestion failed — check your AI provider config."); }
    setAiLoading("");
  };

  const aiSuggestQuestions = async () => {
    setAiLoading("questions");
    try {
      const res = await aiApi.suggestGuidedQuestions(`${form.title}. ${form.purpose}`);
      const questions = res.data.questions || [];
      set("guidedQuestions", [...form.guidedQuestions, ...questions]);
    } catch { alert("AI suggestion failed."); }
    setAiLoading("");
  };

  const aiSuggestMistakes = async () => {
    setAiLoading("mistakes");
    try {
      const res = await aiApi.suggestMistakes(`${form.title}. ${form.purpose}`);
      const mistakes = res.data.mistakes || [];
      set("commonMistakes", [...form.commonMistakes, ...mistakes]);
    } catch { alert("AI suggestion failed."); }
    setAiLoading("");
  };

  const aiSuggestVariations = async () => {
    setAiLoading("variations");
    try {
      const res = await aiApi.suggestVariations(`${form.title}. ${form.purpose}`);
      const variations = res.data.variations || [];
      set("variations", [...form.variations, ...variations]);
    } catch { alert("AI suggestion failed."); }
    setAiLoading("");
  };

  const categories = [...new Set(taxonomyItems.map((t) => t.category))];

  // Check for multiple active instruction focuses warning
  const hasActiveFocus = form.instructionFocus?.active?.taxonomy;

  return (
    <div>
      <h1>{isEdit ? "Edit Drill" : "New Drill"}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Basic Info</h3>
          <div className="form-group">
            <label>Title *</label>
            <input className="form-control" required value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Purpose *</label>
            <textarea className="form-control" required value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Sport</label>
              <input className="form-control" placeholder="e.g. football" value={form.sport} onChange={(e) => set("sport", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Intensity</label>
              <select className="form-control" value={form.intensity} onChange={(e) => set("intensity", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (min)</label>
              <input className="form-control" type="number" min={1} value={form.duration} onChange={(e) => set("duration", parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
        </div>

        {/* Instruction Focus */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Instruction Focus</h3>
          {hasActiveFocus && (
            <div className="alert alert-warning">One active instruction focus is set. Changing it will archive the current one.</div>
          )}
          <div className="form-group">
            <label>Active Focus (Taxonomy)</label>
            <select
              className="form-control"
              value={form.instructionFocus.active.taxonomy || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  instructionFocus: {
                    ...prev.instructionFocus,
                    active: { ...prev.instructionFocus.active, taxonomy: e.target.value || null },
                  },
                }))
              }
            >
              <option value="">-- Select --</option>
              {taxonomyItems.filter((t) => t.category === "individual_skills").map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Focus Description</label>
            <input
              className="form-control"
              value={form.instructionFocus.active.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  instructionFocus: {
                    ...prev.instructionFocus,
                    active: { ...prev.instructionFocus.active, description: e.target.value },
                  },
                }))
              }
            />
          </div>
        </div>

        {/* Tags */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Tags</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={aiSuggestTags} disabled={aiLoading === "tags"}>
              {aiLoading === "tags" ? "Suggesting..." : "AI Suggest Tags"}
            </button>
          </div>
          <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
            {form.tags.map((t, i) => {
              const item = taxonomyItems.find((tx) => tx._id === t.taxonomy);
              return (
                <span key={i} className="tag" style={{ cursor: "pointer" }} onClick={() => removeTag(i)} title="Click to remove">
                  {item?.name || t.category} &times;
                </span>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.5rem", alignItems: "end" }}>
            <select id="tagCategory" className="form-control">
              {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
            <select id="tagTaxonomy" className="form-control">
              {taxonomyItems.map((t) => <option key={t._id} value={t._id}>{t.category}: {t.name}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const cat = document.getElementById("tagCategory").value;
                const tax = document.getElementById("tagTaxonomy").value;
                if (cat && tax) addTag(cat, tax);
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Guided Questions */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Guided Discovery Questions</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={aiSuggestQuestions} disabled={!!aiLoading}>
              {aiLoading === "questions" ? "Generating..." : "AI Suggest"}
            </button>
          </div>
          {form.guidedQuestions.map((q, i) => (
            <div key={i} className="flex gap-sm mb-1">
              <input
                className="form-control"
                value={q}
                onChange={(e) => {
                  const updated = [...form.guidedQuestions];
                  updated[i] = e.target.value;
                  set("guidedQuestions", updated);
                }}
              />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => set("guidedQuestions", form.guidedQuestions.filter((_, j) => j !== i))}>
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-sm">
            <input className="form-control" placeholder="New question..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newQuestion.trim()) { set("guidedQuestions", [...form.guidedQuestions, newQuestion.trim()]); setNewQuestion(""); } }}>
              Add
            </button>
          </div>
        </div>

        {/* Rules */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Rules & Constraints</h3>
          {form.rules.map((r, i) => (
            <div key={i} className="flex gap-sm mb-1">
              <input className="form-control" value={r} onChange={(e) => { const u = [...form.rules]; u[i] = e.target.value; set("rules", u); }} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => set("rules", form.rules.filter((_, j) => j !== i))}>&times;</button>
            </div>
          ))}
          <div className="flex gap-sm">
            <input className="form-control" placeholder="New rule..." value={newRule} onChange={(e) => setNewRule(e.target.value)} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (newRule.trim()) { set("rules", [...form.rules, newRule.trim()]); setNewRule(""); } }}>Add</button>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Common Mistakes</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={aiSuggestMistakes} disabled={!!aiLoading}>
              {aiLoading === "mistakes" ? "Generating..." : "AI Suggest"}
            </button>
          </div>
          {form.commonMistakes.map((m, i) => (
            <div key={i} className="flex gap-sm mb-1">
              <input className="form-control" placeholder="Mistake" value={m.mistake} onChange={(e) => { const u = [...form.commonMistakes]; u[i] = { ...u[i], mistake: e.target.value }; set("commonMistakes", u); }} />
              <input className="form-control" placeholder="Correction" value={m.correction} onChange={(e) => { const u = [...form.commonMistakes]; u[i] = { ...u[i], correction: e.target.value }; set("commonMistakes", u); }} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => set("commonMistakes", form.commonMistakes.filter((_, j) => j !== i))}>&times;</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("commonMistakes", [...form.commonMistakes, { mistake: "", correction: "" }])}>+ Add Mistake</button>
        </div>

        {/* Variations */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>Variations & Progressions</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={aiSuggestVariations} disabled={!!aiLoading}>
              {aiLoading === "variations" ? "Generating..." : "AI Suggest"}
            </button>
          </div>
          {form.variations.map((v, i) => (
            <div key={i} className="card mb-1" style={{ background: "var(--color-bg)" }}>
              <div className="flex gap-sm mb-1">
                <input className="form-control" placeholder="Title" value={v.title} onChange={(e) => { const u = [...form.variations]; u[i] = { ...u[i], title: e.target.value }; set("variations", u); }} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => set("variations", form.variations.filter((_, j) => j !== i))}>&times;</button>
              </div>
              <textarea className="form-control" placeholder="Description" value={v.description} onChange={(e) => { const u = [...form.variations]; u[i] = { ...u[i], description: e.target.value }; set("variations", u); }} />
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("variations", [...form.variations, { title: "", description: "" }])}>+ Add Variation</button>
        </div>

        {/* Space & Game Form */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Space & Game Form</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Dimensions</label>
              <input className="form-control" placeholder="e.g. 20x30m" value={form.space.dimensions} onChange={(e) => set("space", { ...form.space, dimensions: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Shape</label>
              <input className="form-control" placeholder="e.g. rectangle" value={form.space.shape} onChange={(e) => set("space", { ...form.space, shape: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Game Format</label>
              <input className="form-control" placeholder="e.g. 4v4" value={form.gameForm.format} onChange={(e) => set("gameForm", { ...form.gameForm, format: e.target.value })} />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={form.gameForm.goalkeepers} onChange={(e) => set("gameForm", { ...form.gameForm, goalkeepers: e.target.checked })} />
                {" "}Goalkeepers
              </label>
            </div>
          </div>
        </div>

        {/* Success Criteria */}
        <div className="card mb-1">
          <h3 style={{ marginBottom: "1rem" }}>Success Criteria</h3>
          {form.successCriteria.map((sc, i) => (
            <div key={i} className="flex gap-sm mb-1">
              <input className="form-control" placeholder="Type" value={sc.type} style={{ maxWidth: 150 }} onChange={(e) => { const u = [...form.successCriteria]; u[i] = { ...u[i], type: e.target.value }; set("successCriteria", u); }} />
              <input className="form-control" placeholder="Description" value={sc.description} onChange={(e) => { const u = [...form.successCriteria]; u[i] = { ...u[i], description: e.target.value }; set("successCriteria", u); }} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => set("successCriteria", form.successCriteria.filter((_, j) => j !== i))}>&times;</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("successCriteria", [...form.successCriteria, { type: "", description: "" }])}>+ Add Criterion</button>
        </div>

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update Drill" : "Create Drill"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/drills")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
