import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, createSession, updateSession } from "../api/sessions";
import { suggestSession } from "../api/ai";
import BlockList from "../components/sessions/BlockList";
import DrillPickerModal from "../components/sessions/DrillPickerModal";
import DebugPanel from "../components/common/DebugPanel";
import { FiSave, FiX, FiZap, FiLoader, FiCode } from "react-icons/fi";

const EMPTY_SESSION = {
  title: "",
  description: "",
  date: "",
  sport: "",
  expectedPlayers: "",
  expectedTrainers: "",
  blocks: [],
};

export default function SessionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_SESSION);
  const [mode, setMode] = useState("manual"); // "manual" | "ai"
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNumPlayers, setAiNumPlayers] = useState("");
  const [aiTotalMinutes, setAiTotalMinutes] = useState("");
  const [aiPreview, setAiPreview] = useState(null);
  const [aiDrills, setAiDrills] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState([]);

  // Drill picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  // Load existing session for edit
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      getSession(id)
        .then((res) => {
          const s = res.data;
          setForm({
            title: s.title || "",
            description: s.description || "",
            date: s.date ? s.date.slice(0, 10) : "",
            sport: s.sport || "",
            expectedPlayers: s.expectedPlayers || "",
            expectedTrainers: s.expectedTrainers || "",
            blocks: (s.blocks || []).map((b, i) => ({
              ...b,
              order: i,
              drills: (b.drills || []).map((d) => ({
                drill: d.drill?._id || d.drill,
                _drillTitle: d.drill?.title || "",
                duration: d.duration,
                notes: d.notes || "",
              })),
              stations: (b.stations || []).map((st) => ({
                ...st,
                drill: st.drill?._id || st.drill,
                _drillTitle: st.drill?.title || "",
              })),
            })),
          });
        })
        .catch(() => setError("Failed to load session"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  // Compute total duration
  const totalDuration = form.blocks.reduce((sum, block) => {
    switch (block.type) {
      case "drills":
        return sum + (block.drills || []).reduce((s, d) => s + (d.duration || 0), 0);
      case "stations":
        return sum + (block.stationCount || 0) * (block.rotationMinutes || 0);
      default:
        return sum + (block.duration || 0);
    }
  }, 0);

  // Handle drill picker
  const openPicker = useCallback((blockIdx, type, stationIdx) => {
    setPickerTarget({ blockIdx, type, stationIdx });
    setPickerOpen(true);
  }, []);

  const handlePickDrill = useCallback(
    (drill) => {
      if (!pickerTarget) return;
      const { blockIdx, type, stationIdx } = pickerTarget;
      const blocks = [...form.blocks];
      const block = { ...blocks[blockIdx] };

      if (type === "drills") {
        const durationStr = drill.setup?.duration || "";
        const parsedDuration = parseInt(durationStr, 10) || 10;
        block.drills = [
          ...(block.drills || []),
          {
            drill: drill._id,
            _drillTitle: drill.title,
            duration: parsedDuration,
            notes: "",
          },
        ];
      } else if (type === "stations" && stationIdx !== undefined) {
        const stations = [...(block.stations || [])];
        stations[stationIdx] = {
          ...stations[stationIdx],
          drill: drill._id,
          _drillTitle: drill.title,
        };
        block.stations = stations;
      }

      blocks[blockIdx] = block;
      setForm((prev) => ({ ...prev, blocks }));
      setPickerOpen(false);
      setPickerTarget(null);
    },
    [pickerTarget, form.blocks]
  );

  // AI generation
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await suggestSession({
        description: aiPrompt,
        numPlayers: aiNumPlayers ? parseInt(aiNumPlayers, 10) : undefined,
        totalMinutes: aiTotalMinutes ? parseInt(aiTotalMinutes, 10) : undefined,
        useAll: false,
      });
      setAiPreview(res.data.suggestion);
      setAiDrills(res.data.availableDrills || []);
      if (res.data.debug) {
        setDebugEntries((prev) => [
          ...prev,
          { label: "Session Generation", debug: res.data.debug },
        ]);
      }
    } catch {
      setError("AI generation failed. Check your AI provider config.");
    } finally {
      setGenerating(false);
    }
  };

  // Import AI preview into the form
  const importAiPlan = () => {
    if (!aiPreview) return;
    const drillMap = {};
    for (const d of aiDrills) {
      drillMap[d.title.toLowerCase()] = d;
    }

    const blocks = (aiPreview.blocks || []).map((ab, i) => {
      const base = { type: ab.type, label: ab.label || "", order: i, notes: ab.notes || "" };

      if (ab.type === "drills") {
        const drills = (ab.drillTitles || [])
          .map((title, j) => {
            const match = drillMap[title.toLowerCase()];
            if (!match) return null; // Skip drills not in our system
            return {
              drill: match._id,
              _drillTitle: match.title,
              duration: ab.durations?.[j] || parseInt(match.setup?.duration, 10) || 10,
              notes: "",
            };
          })
          .filter(Boolean);
        if (drills.length === 0) return null; // Skip empty drill blocks
        return { ...base, drills };
      }

      if (ab.type === "stations") {
        const stations = (ab.stationDrills || [])
          .map((sd) => {
            const match = drillMap[(sd.drillTitle || "").toLowerCase()];
            if (!match) return null; // Skip drills not in our system
            return {
              stationNumber: sd.stationNumber,
              drill: match._id,
              _drillTitle: match.title,
              notes: "",
            };
          })
          .filter(Boolean);
        if (stations.length === 0) return null; // Skip empty station blocks
        return {
          ...base,
          stationCount: ab.stationCount || stations.length,
          rotationMinutes: ab.rotationMinutes || 5,
          stations,
        };
      }

      if (ab.type === "matchplay") {
        return {
          ...base,
          duration: ab.duration || 15,
          matchDescription: ab.matchDescription || "",
          rules: ab.rules || "",
        };
      }

      if (ab.type === "break") {
        return { ...base, duration: ab.duration || 3 };
      }

      return { ...base, duration: ab.duration || 5, customContent: ab.customContent || "" };
    }).filter(Boolean).map((b, i) => ({ ...b, order: i }));

    setForm((prev) => ({
      ...prev,
      title: aiPreview.title || prev.title,
      description: aiPreview.description || prev.description,
      blocks,
    }));
    setMode("manual");
    setAiPreview(null);
  };

  // Save
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: form.date || undefined,
        sport: form.sport || undefined,
        expectedPlayers: form.expectedPlayers || 0,
        expectedTrainers: form.expectedTrainers || 0,
        blocks: form.blocks.map((b, i) => ({
          ...b,
          order: i,
          drills: (b.drills || []).map(({ _drillTitle, ...rest }) => rest),
          stations: (b.stations || []).map(({ _drillTitle, ...rest }) => rest),
        })),
      };
      if (isEdit) {
        await updateSession(id, payload);
      } else {
        await createSession(payload);
      }
      navigate("/sessions");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1>{isEdit ? "Edit Session" : "Create Session"}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Debug toggle */}
      {debugEntries.length > 0 && (
        <button
          type="button"
          className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"} mb-1`}
          onClick={() => setDebugOpen(!debugOpen)}
          style={{ float: "right" }}
        >
          <FiCode /> Debug ({debugEntries.length})
        </button>
      )}

      {/* Mode toggle */}
      {!isEdit && (
        <div className="mode-toggle mb-1" style={{ clear: "both" }}>
          <button
            type="button"
            className={`mode-toggle-btn ${mode === "manual" ? "mode-toggle-btn-active" : ""}`}
            onClick={() => setMode("manual")}
          >
            Build Manually
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${mode === "ai" ? "mode-toggle-btn-active" : ""}`}
            onClick={() => setMode("ai")}
          >
            <FiZap /> Generate with AI
          </button>
        </div>
      )}

      {/* AI Generation panel */}
      {mode === "ai" && !aiPreview && (
        <div className="card ai-session-panel mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>Describe your session</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
            Describe what you want to train. The AI will build a full session with warmup,
            stations, games, cooldown — whatever fits best.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="text-sm">Sport</label>
              <input
                className="form-control"
                placeholder="e.g. football"
                value={form.sport}
                onChange={(e) => setForm((prev) => ({ ...prev, sport: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="text-sm">Number of players</label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g. 16"
                value={aiNumPlayers}
                onChange={(e) => setAiNumPlayers(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="text-sm">Total time (min)</label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g. 90"
                value={aiTotalMinutes}
                onChange={(e) => setAiTotalMinutes(e.target.value)}
              />
            </div>
          </div>
          <textarea
            className="form-control"
            placeholder="e.g. 'Focus on 1v1 defending and transition play. Include station work for technique and end with small-sided games.'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            style={{ minHeight: 100 }}
          />
          <div className="flex gap-sm mt-1">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim()}
            >
              {generating ? (
                <><FiLoader className="spin" /> Generating...</>
              ) : (
                <><FiZap /> Generate Session</>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode("manual")}
            >
              Switch to Manual
            </button>
          </div>
        </div>
      )}

      {/* AI Preview */}
      {mode === "ai" && aiPreview && (() => {
        const drillSet = new Set(aiDrills.map((d) => d.title.toLowerCase()));
        return (
        <div className="card ai-session-panel mb-1">
          <h3 style={{ marginBottom: "0.5rem" }}>{aiPreview.title || "AI Session Plan"}</h3>
          {aiPreview.description && (
            <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
              {aiPreview.description}
            </p>
          )}
          {(aiPreview.blocks || []).map((block, i) => (
            <div key={i} className="ai-preview-block">
              <div className="flex-between">
                <strong className="text-sm">{block.label || block.type}</strong>
                <span className="tag">{block.type}</span>
              </div>
              {block.type === "drills" && block.drillTitles && (
                <div className="text-sm" style={{ marginTop: "0.25rem" }}>
                  {block.drillTitles.map((title, j) => {
                    const found = drillSet.has(title.toLowerCase());
                    return (
                      <span key={j}>
                        {j > 0 && ", "}
                        <span style={found ? {} : { color: "var(--color-danger)", textDecoration: "line-through" }}>
                          {title}
                        </span>
                        {!found && <span style={{ color: "var(--color-danger)", fontSize: "0.75rem" }}> (ej i systemet)</span>}
                      </span>
                    );
                  })}
                </div>
              )}
              {block.type === "stations" && (
                <div className="text-sm" style={{ marginTop: "0.25rem" }}>
                  <span className="text-muted">{block.stationCount} stationer, {block.rotationMinutes} min rotation</span>
                  {block.stationDrills && (
                    <div style={{ marginTop: "0.25rem" }}>
                      {block.stationDrills.map((s, j) => {
                        const found = drillSet.has((s.drillTitle || "").toLowerCase());
                        return (
                          <div key={j} style={{ marginLeft: "0.5rem" }}>
                            <span className="text-muted">Station {s.stationNumber}: </span>
                            <span style={found ? {} : { color: "var(--color-danger)", textDecoration: "line-through" }}>
                              {s.drillTitle}
                            </span>
                            {!found && <span style={{ color: "var(--color-danger)", fontSize: "0.75rem" }}> (ej i systemet)</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {block.type === "matchplay" && (
                <p className="text-sm text-muted">
                  {block.matchDescription} {block.rules && `(${block.rules})`} — {block.duration}{" "}
                  min
                </p>
              )}
              {block.type === "break" && (
                <p className="text-sm text-muted">{block.duration} min</p>
              )}
              {block.type === "custom" && block.customContent && (
                <p className="text-sm text-muted">{block.customContent}</p>
              )}
            </div>
          ))}
          <div className="flex gap-sm mt-1">
            <button type="button" className="btn btn-primary" onClick={importAiPlan}>
              Use This Plan
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAiPreview(null)}
            >
              Regenerate
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAiPreview(null);
                setMode("manual");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
        );
      })()}

      {/* Manual builder form */}
      {mode === "manual" && (
        <form onSubmit={handleSubmit}>
          <div className="card mb-1">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  className="form-control"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Sport</label>
                <input
                  className="form-control"
                  placeholder="e.g. football"
                  value={form.sport}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sport: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  className="form-control"
                  placeholder="Session goal or theme"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Expected players</label>
                <input
                  className="form-control"
                  type="number"
                  placeholder="e.g. 16"
                  min={0}
                  value={form.expectedPlayers}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      expectedPlayers: e.target.value ? parseInt(e.target.value, 10) : "",
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Expected trainers</label>
                <input
                  className="form-control"
                  type="number"
                  placeholder="e.g. 3"
                  min={0}
                  value={form.expectedTrainers}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      expectedTrainers: e.target.value ? parseInt(e.target.value, 10) : "",
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <BlockList
            blocks={form.blocks}
            onChange={(blocks) => setForm((prev) => ({ ...prev, blocks }))}
            onPickDrill={openPicker}
          />

          <div className="session-footer">
            <div>
              <strong>Total: {totalDuration} min</strong>
              <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                ({form.blocks.length} block{form.blocks.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="flex gap-sm">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FiSave />{" "}
                {saving ? "Saving..." : isEdit ? "Update Session" : "Save Session"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/sessions")}
              >
                <FiX /> Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Debug panel */}
      {debugOpen && <DebugPanel entries={debugEntries} />}

      {/* Drill picker modal */}
      {pickerOpen && (
        <DrillPickerModal
          onSelect={handlePickDrill}
          onClose={() => {
            setPickerOpen(false);
            setPickerTarget(null);
          }}
          sport={form.sport || undefined}
        />
      )}
    </div>
  );
}
