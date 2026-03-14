import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDrill, createDrill, updateDrill, checkSimilarity } from "../api/drills";
import { generateDrill } from "../api/ai";
import { FiZap, FiSave, FiX, FiPlus, FiTrash2, FiAlertCircle } from "react-icons/fi";

const EMPTY_DRILL = {
  title: "",
  description: "",
  sport: "",
  intensity: "medium",
  setup: { players: "", space: "", equipment: [], duration: "" },
  howItWorks: "",
  coachingPoints: [],
  variations: [],
  commonMistakes: [],
};

export default function DrillFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_DRILL);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const [checking, setChecking] = useState(false);
  const originalDrill = useRef(null);

  useEffect(() => {
    if (isEdit) {
      getDrill(id).then((res) => {
        const d = res.data;
        originalDrill.current = d;
        setForm({
          title: d.title || "",
          description: d.description || "",
          sport: d.sport || "",
          intensity: d.intensity || "medium",
          setup: d.setup || { players: "", space: "", equipment: [], duration: "" },
          howItWorks: d.howItWorks || "",
          coachingPoints: d.coachingPoints || [],
          variations: d.variations || [],
          commonMistakes: d.commonMistakes || [],
        });
        setGenerated(true);
      });
    }
  }, [id, isEdit]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setSetup = (field, value) =>
    setForm((prev) => ({ ...prev, setup: { ...prev.setup, [field]: value } }));

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateDrill(aiPrompt, form.sport || undefined);
      const drill = res.data.drill;
      setForm({
        title: drill.title || "",
        description: drill.description || aiPrompt,
        sport: drill.sport || form.sport || "",
        intensity: drill.intensity || "medium",
        setup: drill.setup || EMPTY_DRILL.setup,
        howItWorks: drill.howItWorks || "",
        coachingPoints: drill.coachingPoints || [],
        variations: drill.variations || [],
        commonMistakes: drill.commonMistakes || [],
      });
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

    // For edits with a parent drill, check similarity before saving
    if (isEdit && originalDrill.current?.parentDrill && !similarityWarning) {
      setChecking(true);
      try {
        const res = await checkSimilarity(id, form);
        if (!res.data.isSameDrill) {
          setSimilarityWarning(res.data.reason);
          setChecking(false);
          return; // Don't save yet — show the warning
        }
      } catch {
        // If similarity check fails, just save anyway
      }
      setChecking(false);
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        aiConversation: !isEdit
          ? [
              { role: "user", content: aiPrompt || form.description },
              { role: "assistant", content: "Drill created." },
            ]
          : undefined,
      };
      if (isEdit) {
        await updateDrill(id, form);
        navigate("/drills");
      } else {
        const res = await createDrill(payload);
        navigate(`/drills/${res.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNew = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        aiConversation: [
          { role: "user", content: `Forked from: ${originalDrill.current?.title || "unknown"}` },
          { role: "assistant", content: "New drill created from a significantly modified version." },
        ],
      };
      await createDrill(payload);
      navigate("/drills");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const addListItem = (field) => set(field, [...form[field], ""]);
  const updateListItem = (field, idx, value) => {
    const updated = [...form[field]];
    updated[idx] = value;
    set(field, updated);
  };
  const removeListItem = (field, idx) =>
    set(field, form[field].filter((_, i) => i !== idx));

  return (
    <div>
      <h1>{isEdit ? "Edit Drill" : "Create a Drill"}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Similarity warning — drill changed too much */}
      {similarityWarning && (
        <div className="alert alert-warning mb-1">
          <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
            <FiAlertCircle style={{ marginTop: "0.2rem", flexShrink: 0 }} />
            <div>
              <strong>This looks like a different drill</strong>
              <p style={{ margin: "0.25rem 0 0.75rem" }}>{similarityWarning}</p>
              <div className="flex gap-sm">
                <button className="btn btn-primary btn-sm" onClick={handleSaveAsNew}>
                  Save as New Drill
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSimilarityWarning(null); handleSubmit({ preventDefault: () => {} }); }}>
                  Save as Version Anyway
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSimilarityWarning(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation prompt (only for new drills) */}
      {!isEdit && !generated && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>Describe your drill</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
            Tell the AI what kind of drill you want. Be as detailed or brief as you like
            — the AI will generate everything from your description.
          </p>
          <div className="form-group">
            <label>Sport (optional)</label>
            <input
              className="form-control"
              placeholder="e.g. football, basketball, handball..."
              value={form.sport}
              onChange={(e) => set("sport", e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>
          <textarea
            className="form-control"
            placeholder="Describe the drill you have in mind... e.g. 'A 4v4 possession game where the team with the ball tries to keep it for 8 passes, with a transition rule when they lose it'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            style={{ minHeight: 120 }}
          />
          <div className="flex gap-sm mt-1">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim()}
            >
              <FiZap /> {generating ? "Generating..." : "Generate Drill with AI"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setGenerated(true)}
            >
              Skip AI — write manually
            </button>
          </div>
        </div>
      )}

      {/* Drill form (shown after generation or skip) */}
      {generated && (
        <form onSubmit={handleSubmit}>
          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Basic Info</h3>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea className="form-control" required value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
            </div>
          </div>

          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Setup</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Players</label>
                <input className="form-control" placeholder="e.g. 8-12, split into 2 teams" value={form.setup.players} onChange={(e) => setSetup("players", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <input className="form-control" placeholder="e.g. 15-20 minutes" value={form.setup.duration} onChange={(e) => setSetup("duration", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Space</label>
              <input className="form-control" placeholder="e.g. 30x20m rectangle with 2 small goals" value={form.setup.space} onChange={(e) => setSetup("space", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Equipment</label>
              {(form.setup.equipment || []).map((item, i) => (
                <div key={i} className="flex gap-sm mb-1">
                  <input className="form-control" value={item} onChange={(e) => { const eq = [...form.setup.equipment]; eq[i] = e.target.value; setSetup("equipment", eq); }} />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setSetup("equipment", form.setup.equipment.filter((_, j) => j !== i))}><FiTrash2 /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSetup("equipment", [...(form.setup.equipment || []), ""])}><FiPlus /> Add Equipment</button>
            </div>
          </div>

          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>How It Works</h3>
            <textarea className="form-control" placeholder="Step-by-step description of how the drill flows..." value={form.howItWorks} onChange={(e) => set("howItWorks", e.target.value)} style={{ minHeight: 120 }} />
          </div>

          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Coaching Points</h3>
            {form.coachingPoints.map((point, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={point} onChange={(e) => updateListItem("coachingPoints", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("coachingPoints", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("coachingPoints")}><FiPlus /> Add Point</button>
          </div>

          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Variations</h3>
            {form.variations.map((v, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={v} onChange={(e) => updateListItem("variations", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("variations", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("variations")}><FiPlus /> Add Variation</button>
          </div>

          <div className="card mb-1">
            <h3 style={{ marginBottom: "1rem" }}>Common Mistakes</h3>
            {form.commonMistakes.map((m, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={m} onChange={(e) => updateListItem("commonMistakes", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("commonMistakes", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("commonMistakes")}><FiPlus /> Add Mistake</button>
          </div>

          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={loading || checking}>
              <FiSave /> {checking ? "Checking..." : loading ? "Saving..." : isEdit ? "Update Drill" : "Save Drill"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/drills")}><FiX /> Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
