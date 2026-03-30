import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDrill, createDrill, updateDrill, checkSimilarity, uploadDiagram } from "../api/drills";
import { getTactics } from "../api/tactics";
import { generateDrill, refineDraft } from "../api/ai";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import useFormState from "../hooks/useFormState";
import { FiZap, FiSave, FiX, FiPlus, FiTrash2, FiAlertCircle, FiCode, FiMessageCircle, FiTarget } from "react-icons/fi";
import DrillFormAiChat from "../components/drills/DrillFormAiChat";

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
  apparatus: "",
  skillLevel: "",
  prerequisites: [],
  safetyNotes: "",
};

export default function DrillFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { form, setForm, set, setNested, addToList, updateInList, removeFromList } = useFormState(EMPTY_DRILL);
  const setSetup = (field, value) => setNested("setup", field, value);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const [checking, setChecking] = useState(false);
  const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();
  const originalDrill = useRef(null);

  // AI refinement chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const [aiChangedFields, setAiChangedFields] = useState(new Set());
  const aiChangeTimer = useRef(null);
  const [diagrams, setDiagrams] = useState([]);
  const [linkedTactics, setLinkedTactics] = useState([]);

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
          apparatus: d.apparatus || "",
          skillLevel: d.skillLevel || "",
          prerequisites: d.prerequisites || [],
          safetyNotes: d.safetyNotes || "",
        });
        setDiagrams(d.diagrams || []);
        setGenerated(true);
      });
      getTactics({ drill: id })
        .then((res) => setLinkedTactics(res.data.boards || []))
        .catch(() => {});
    }
  }, [id, isEdit]);

  // setSetup is aliased from setNested("setup", field, value) via useFormState

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateDrill(aiPrompt, form.sport || undefined);
      const drill = res.data.drill;
      if (res.data.debug) {
        addDebugEntry("Drill Generation", res.data.debug);
      }
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
      setChatHistory([
        { role: "user", content: aiPrompt },
        { role: "assistant", content: t("drills.drillGenerated") },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || t("drills.aiGenFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    const msg = chatMessage.trim();
    setChatLoading(true);
    setChatMessage("");
    try {
      const res = await refineDraft(form, msg, chatHistory);
      if (res.data.debug) {
        addDebugEntry(`Refine: "${msg.slice(0, 40)}${msg.length > 40 ? "..." : ""}"`, res.data.debug);
      }
      setChatHistory(res.data.conversationHistory || []);
      if (res.data.refinedFields) {
        const changed = new Set(Object.keys(res.data.refinedFields));
        setAiChangedFields(changed);
        clearTimeout(aiChangeTimer.current);
        aiChangeTimer.current = setTimeout(() => setAiChangedFields(new Set()), 8000);
        setForm((prev) => ({ ...prev, ...res.data.refinedFields }));
      }
    } catch {
      setChatHistory((prev) => [...prev, { role: "user", content: msg }, { role: "assistant", content: t("drills.aiRefineFailed") }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

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
          ? (chatHistory.length > 0 ? chatHistory : [
              { role: "user", content: aiPrompt || form.description },
              { role: "assistant", content: "Drill created." },
            ])
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
      setError(err.response?.data?.error || t("common.saveFailed"));
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
      setError(err.response?.data?.error || t("common.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const addListItem = (field) => addToList(field, "");
  const updateListItem = (field, idx, value) => updateInList(field, idx, value);
  const removeListItem = (field, idx) => removeFromList(field, idx);

  const handleDiagramUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("diagram", file);
    try {
      const res = await uploadDiagram(id, fd);
      setDiagrams(res.data.diagrams || []);
    } catch (err) {
      setError(err.response?.data?.error || t("common.saveFailed"));
    }
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{isEdit ? t("drills.editDrill") : t("drills.createADrill")}</h1>
        {debugEntries.length > 0 && (
          <button
            type="button"
            className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleDebug}
          >
            <FiCode /> Debug ({debugEntries.length})
          </button>
        )}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {debugOpen && <DebugPanel entries={debugEntries} />}

      {/* Similarity warning — drill changed too much */}
      {similarityWarning && (
        <div className="alert alert-warning mb-1">
          <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
            <FiAlertCircle style={{ marginTop: "0.2rem", flexShrink: 0 }} />
            <div>
              <strong>{t("drills.looksLikeDifferentDrill")}</strong>
              <p style={{ margin: "0.25rem 0 0.75rem" }}>{similarityWarning}</p>
              <div className="flex gap-sm">
                <button className="btn btn-primary btn-sm" onClick={handleSaveAsNew}>
                  {t("drills.saveAsNewDrill")}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSimilarityWarning(null); handleSubmit({ preventDefault: () => {} }); }}>
                  {t("drills.saveAsVersionAnyway")}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSimilarityWarning(null)}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation prompt (only for new drills) */}
      {!isEdit && !generated && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.75rem" }}>{t("drills.describeYourDrill")}</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
            {t("drills.describeYourDrillHint")}
          </p>
          <div className="form-group">
            <label>{t("drills.sportOptional")}</label>
            <input
              className="form-control"
              placeholder={t("drills.sportPlaceholder")}
              value={form.sport}
              onChange={(e) => set("sport", e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>
          <textarea
            className="form-control"
            placeholder={t("drills.drillPromptPlaceholder")}
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
              <FiZap /> {generating ? t("drills.generating") : t("drills.generateDrillWithAi")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setGenerated(true)}
            >
              {t("drills.skipAiManual")}
            </button>
          </div>
        </div>
      )}

      {/* Drill form (shown after generation or skip) */}
      {generated && (
        <div className="drill-detail-layout">
        <form onSubmit={handleSubmit} className="drill-detail-main">
          <div className={`card mb-1${["title", "description", "sport", "intensity"].some((f) => aiChangedFields.has(f)) ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.basicInfo")}</h3>
            <div className="form-group">
              <label>{t("drills.titleRequired")}</label>
              <input className="form-control" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t("drills.descriptionRequired")}</label>
              <textarea className="form-control" required value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>{t("drills.sport")}</label>
                <input className="form-control" placeholder={t("drills.sportEg")} value={form.sport} onChange={(e) => set("sport", e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t("drills.intensity")}</label>
                <select className="form-control" value={form.intensity} onChange={(e) => set("intensity", e.target.value)}>
                  <option value="low">{t("drills.low")}</option>
                  <option value="medium">{t("drills.medium")}</option>
                  <option value="high">{t("drills.high")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sport-specific fields */}
          <div className={`card mb-1${["apparatus", "skillLevel"].some((f) => aiChangedFields.has(f)) ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.sportSpecific")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>{t("drills.apparatus")}</label>
                <input className="form-control" placeholder={t("drills.apparatusPlaceholder")} value={form.apparatus} onChange={(e) => set("apparatus", e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t("drills.skillLevel")}</label>
                <select className="form-control" value={form.skillLevel} onChange={(e) => set("skillLevel", e.target.value)}>
                  <option value="">{t("drills.anyLevel")}</option>
                  <option value="beginner">{t("drills.beginner")}</option>
                  <option value="intermediate">{t("drills.intermediate")}</option>
                  <option value="advanced">{t("drills.advanced")}</option>
                  <option value="competitive">{t("drills.competitive")}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{t("drills.safetyNotes")}</label>
              <textarea className="form-control" placeholder={t("drills.safetyNotesPlaceholder")} value={form.safetyNotes} onChange={(e) => set("safetyNotes", e.target.value)} style={{ minHeight: 60 }} />
            </div>
            <div className="form-group">
              <label>{t("drills.prerequisites")}</label>
              {(form.prerequisites || []).map((p, i) => (
                <div key={i} className="flex gap-sm mb-1">
                  <input className="form-control" value={p} onChange={(e) => updateListItem("prerequisites", i, e.target.value)} />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("prerequisites", i)}><FiTrash2 /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("prerequisites")}><FiPlus /> {t("drills.addPrerequisite")}</button>
            </div>
          </div>

          <div className={`card mb-1${aiChangedFields.has("setup") ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.setup")}</h3>
            <div className="form-group">
              <label>{t("drills.players").replace(":", "")}</label>
              <input className="form-control" placeholder={t("drills.playersPlaceholder")} value={form.setup.players} onChange={(e) => setSetup("players", e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t("drills.space").replace(":", "")}</label>
              <input className="form-control" placeholder={t("drills.spacePlaceholder")} value={form.setup.space} onChange={(e) => setSetup("space", e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t("drills.equipment").replace(":", "")}</label>
              {(form.setup.equipment || []).map((item, i) => (
                <div key={i} className="flex gap-sm mb-1">
                  <input className="form-control" value={item} onChange={(e) => { const eq = [...form.setup.equipment]; eq[i] = e.target.value; setSetup("equipment", eq); }} />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setSetup("equipment", form.setup.equipment.filter((_, j) => j !== i))}><FiTrash2 /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSetup("equipment", [...(form.setup.equipment || []), ""])}><FiPlus /> {t("drills.addEquipment")}</button>
            </div>
          </div>

          <div className={`card mb-1${aiChangedFields.has("howItWorks") ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.howItWorks")}</h3>
            <textarea className="form-control" placeholder={t("drills.howItWorksPlaceholder")} value={form.howItWorks} onChange={(e) => set("howItWorks", e.target.value)} style={{ minHeight: 120 }} />
          </div>

          <div className={`card mb-1${aiChangedFields.has("coachingPoints") ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.coachingPoints")}</h3>
            {form.coachingPoints.map((point, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={point} onChange={(e) => updateListItem("coachingPoints", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("coachingPoints", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("coachingPoints")}><FiPlus /> {t("drills.addPoint")}</button>
          </div>

          <div className={`card mb-1${aiChangedFields.has("variations") ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.variations")}</h3>
            {form.variations.map((v, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={v} onChange={(e) => updateListItem("variations", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("variations", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("variations")}><FiPlus /> {t("drills.addVariation")}</button>
          </div>

          <div className={`card mb-1${aiChangedFields.has("commonMistakes") ? " ai-changed" : ""}`}>
            <h3 style={{ marginBottom: "1rem" }}>{t("drills.commonMistakes")}</h3>
            {form.commonMistakes.map((m, i) => (
              <div key={i} className="flex gap-sm mb-1">
                <input className="form-control" value={m} onChange={(e) => updateListItem("commonMistakes", i, e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeListItem("commonMistakes", i)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addListItem("commonMistakes")}><FiPlus /> {t("drills.addMistake")}</button>
          </div>

          {/* Diagrams (edit mode only) */}
          {isEdit && (
            <div className="card mb-1">
              <h3 style={{ marginBottom: "1rem" }}>{t("drills.diagrams")}</h3>
              <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                {diagrams.map((d, i) => (
                  <img key={i} src={d} alt={`Diagram ${i + 1}`} style={{ maxWidth: 300, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
                ))}
              </div>
              <div className="mt-1">
                <label className="text-sm text-muted" style={{ marginRight: "0.5rem" }}>{t("drills.uploadDiagram")}</label>
                <input type="file" accept="image/*,.pdf" onChange={handleDiagramUpload} />
              </div>
            </div>
          )}

          {/* Linked Tactic Boards (edit mode only) */}
          {isEdit && (
            <div className="card mb-1">
              <div className="flex-between">
                <h3><FiTarget style={{ marginRight: "0.4rem" }} />{t("drills.tacticBoards")}</h3>
                <Link
                  to={`/tactics/new?${new URLSearchParams({ drillDescription: [form.description, form.howItWorks].filter(Boolean).join("\n\n"), drillTitle: form.title || "", drillId: id }).toString()}`}
                  className="btn btn-primary btn-sm"
                >
                  <FiPlus /> {t("drills.newTacticBoard")}
                </Link>
              </div>
              {linkedTactics.length === 0 ? (
                <p className="text-sm text-muted mt-1">{t("drills.noTacticBoards")}</p>
              ) : (
                <div className="mt-1" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {linkedTactics.map((tb) => (
                    <Link key={tb._id} to={`/tactics/${tb._id}`} className="drill-tactic-card">
                      <div>
                        <strong>{tb.title || t("tactics.untitled")}</strong>
                        <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                          {tb.fieldType} · {tb.homeTeam?.formation || "4-4-2"} vs {tb.awayTeam?.formation || "4-4-2"}
                        </span>
                      </div>
                      <span className="text-sm text-muted">{new Date(tb.updatedAt).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={loading || checking}>
              <FiSave /> {checking ? t("common.checking") : loading ? t("common.saving") : isEdit ? t("drills.updateDrill") : t("drills.saveDrill")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowChat(!showChat)}>
              <FiMessageCircle /> {showChat ? t("drills.hideChat") : t("drills.refineWithAi")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/drills")}><FiX /> {t("common.cancel")}</button>
          </div>
        </form>

        {/* AI Chat Panel (for refining during creation) */}
        {showChat && (
          <DrillFormAiChat
            chatHistory={chatHistory}
            chatMessage={chatMessage}
            chatLoading={chatLoading}
            onMessageChange={(e) => setChatMessage(e.target.value)}
            onSend={handleChatSend}
            onKeyDown={handleChatKeyDown}
            chatEndRef={chatEndRef}
          />
        )}
        </div>
      )}
    </div>
  );
}
