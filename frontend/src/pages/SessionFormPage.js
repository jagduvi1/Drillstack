import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { getSession, createSession, updateSession } from "../api/sessions";
import { suggestSession } from "../api/ai";
import BlockList from "../components/sessions/BlockList";
import DrillPickerModal from "../components/sessions/DrillPickerModal";
import DrillPreviewModal from "../components/sessions/DrillPreviewModal";
import SessionAiPanel from "../components/sessions/SessionAiPanel";
import SessionAiPreview from "../components/sessions/SessionAiPreview";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import { useGroups } from "../context/GroupContext";
import { FiSave, FiX, FiZap, FiCode } from "react-icons/fi";

const EMPTY_SESSION = {
  title: "",
  description: "",
  date: "",
  sport: "",
  expectedPlayers: "",
  expectedTrainers: "",
  blocks: [],
  group: "",
  visibility: "private",
};

export default function SessionFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { groups, activeGroupId } = useGroups();
  const [form, setForm] = useState({ ...EMPTY_SESSION, group: activeGroupId || "", visibility: activeGroupId ? "group" : "private" });
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);
  useUnsavedChanges(dirty);
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
  const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();

  // Drill picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  // Drill preview state
  const [previewDrillId, setPreviewDrillId] = useState(null);

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
            group: s.group || "",
            visibility: s.visibility || "private",
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
        .catch(() => setError(t("sessions.failedToLoad")))
        .finally(() => { setLoading(false); loaded.current = true; });
    } else {
      loaded.current = true;
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (loaded.current) setDirty(true);
  }, [form]);

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
        addDebugEntry("Session Generation", res.data.debug);
      }
    } catch {
      setError(t("sessions.aiGenFailed"));
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
        group: form.group || null,
        visibility: form.group ? form.visibility : "private",
        expectedPlayers: form.expectedPlayers || 0,
        expectedTrainers: form.expectedTrainers || 0,
        blocks: form.blocks.map((b, i) => ({
          ...b,
          order: i,
          drills: (b.drills || []).map(({ _drillTitle, ...rest }) => rest),
          stations: (b.stations || []).map(({ _drillTitle, ...rest }) => rest),
        })),
      };
      setDirty(false);
      if (isEdit) {
        await updateSession(id, payload);
      } else {
        await createSession(payload);
      }
      navigate("/sessions");
    } catch (err) {
      setError(err.response?.data?.error || t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <h1>{isEdit ? t("sessions.editSession") : t("sessions.createSession")}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Debug toggle */}
      {debugEntries.length > 0 && (
        <button
          type="button"
          className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"} mb-1`}
          onClick={toggleDebug}
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
            {t("sessions.buildManually")}
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${mode === "ai" ? "mode-toggle-btn-active" : ""}`}
            onClick={() => setMode("ai")}
          >
            <FiZap /> {t("sessions.generateWithAi")}
          </button>
        </div>
      )}

      {/* AI Generation panel */}
      {mode === "ai" && !aiPreview && (
        <SessionAiPanel
          sport={form.sport}
          onSportChange={(v) => setForm((prev) => ({ ...prev, sport: v }))}
          aiPrompt={aiPrompt}
          onAiPromptChange={setAiPrompt}
          aiNumPlayers={aiNumPlayers}
          onAiNumPlayersChange={setAiNumPlayers}
          aiTotalMinutes={aiTotalMinutes}
          onAiTotalMinutesChange={setAiTotalMinutes}
          generating={generating}
          onGenerate={handleGenerate}
          onSwitchToManual={() => setMode("manual")}
        />
      )}

      {/* AI Preview */}
      {mode === "ai" && aiPreview && (
        <SessionAiPreview
          aiPreview={aiPreview}
          aiDrills={aiDrills}
          onAccept={importAiPlan}
          onRegenerate={() => setAiPreview(null)}
          onCancel={() => { setAiPreview(null); setMode("manual"); }}
          onPreviewDrill={(drillId) => setPreviewDrillId(drillId)}
        />
      )}

      {/* Manual builder form */}
      {mode === "manual" && (
        <form onSubmit={handleSubmit}>
          <div className="card mb-1">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>{t("sessions.titleLabel")}</label>
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
                <label>{t("sessions.dateLabel")}</label>
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
                <label>{t("sessions.sportLabel")}</label>
                <input
                  className="form-control"
                  placeholder={t("sessions.sportPlaceholder")}
                  value={form.sport}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sport: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("sessions.description")}</label>
                <input
                  className="form-control"
                  placeholder={t("sessions.descriptionPlaceholder")}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>{t("sessions.expectedPlayers")}</label>
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
                <label>{t("sessions.expectedTrainers")}</label>
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

            {/* Sharing controls */}
            {groups.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>{t("sessions.shareWith")}</label>
                  <select className="form-control" value={form.group || ""}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      group: e.target.value || "",
                      visibility: e.target.value ? prev.visibility === "private" ? "group" : prev.visibility : "private",
                    }))}>
                    <option value="">{t("sessions.privateOnly")}</option>
                    {groups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}{g.parentClub?.name ? ` (${g.parentClub.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {form.group && (
                  <div className="form-group">
                    <label>{t("sessions.visibility")}</label>
                    <select className="form-control" value={form.visibility}
                      onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}>
                      <option value="group">{t("sessions.teamOnly")}</option>
                      <option value="club">{t("sessions.entireClub")}</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <BlockList
            blocks={form.blocks}
            onChange={(blocks) => setForm((prev) => ({ ...prev, blocks }))}
            onPickDrill={openPicker}
            onPreviewDrill={(drillId) => drillId && setPreviewDrillId(drillId)}
          />

          <div className="session-footer">
            <div>
              <strong>{t("common.total", { count: totalDuration })}</strong>
              <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                ({t("common.block", { count: form.blocks.length })})
              </span>
            </div>
            <div className="flex gap-sm">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <FiSave />{" "}
                {saving ? t("common.saving") : isEdit ? t("sessions.updateSession") : t("sessions.saveSession")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/sessions")}
              >
                <FiX /> {t("common.cancel")}
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

      {/* Drill preview modal */}
      {previewDrillId && (
        <DrillPreviewModal
          drillId={previewDrillId}
          onClose={() => setPreviewDrillId(null)}
        />
      )}
    </div>
  );
}
