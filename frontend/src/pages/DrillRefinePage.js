import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getDrill, checkSimilarity, createDrill } from "../api/drills";
import { refineDrill } from "../api/ai";
import { FiSend, FiSave, FiX, FiLoader, FiGitBranch, FiAlertCircle, FiArrowRight } from "react-icons/fi";

// Sections we track for change highlighting
const SECTIONS = [
  { key: "title", label: "Title", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "sport", label: "Sport", type: "text" },
  { key: "intensity", label: "Intensity", type: "text" },
  { key: "howItWorks", label: "How It Works", type: "text" },
  { key: "setup", label: "Setup", type: "setup" },
  { key: "coachingPoints", label: "Coaching Points", type: "list" },
  { key: "variations", label: "Variations", type: "list" },
  { key: "commonMistakes", label: "Common Mistakes", type: "list" },
];

function hasChanged(original, current, key, type) {
  if (type === "list") {
    const a = original[key] || [];
    const b = current[key] || [];
    if (a.length !== b.length) return true;
    return a.some((v, i) => v !== b[i]);
  }
  if (type === "setup") {
    const a = original.setup || {};
    const b = current.setup || {};
    return (
      a.players !== b.players ||
      a.space !== b.space ||
      a.duration !== b.duration ||
      JSON.stringify(a.equipment) !== JSON.stringify(b.equipment)
    );
  }
  return (original[key] || "") !== (current[key] || "");
}

function SetupDisplay({ setup }) {
  if (!setup) return <span className="text-muted">-</span>;
  return (
    <div>
      {setup.players && <p><strong>Players:</strong> {setup.players}</p>}
      {setup.space && <p><strong>Space:</strong> {setup.space}</p>}
      {setup.duration && <p><strong>Duration:</strong> {setup.duration}</p>}
      {setup.equipment?.length > 0 && (
        <p><strong>Equipment:</strong> {setup.equipment.join(", ")}</p>
      )}
    </div>
  );
}

function ListDisplay({ items }) {
  if (!items?.length) return <span className="text-muted">-</span>;
  return (
    <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function SectionValue({ section, drill }) {
  if (section.type === "setup") return <SetupDisplay setup={drill.setup} />;
  if (section.type === "list") return <ListDisplay items={drill[section.key]} />;
  return <span>{drill[section.key] || <span className="text-muted">-</span>}</span>;
}

export default function DrillRefinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: drill, loading, refetch } = useFetch(() => getDrill(id), [id]);

  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const chatEndRef = useRef(null);
  const originalDrill = useRef(null);

  // Capture the original drill state on first load (before any AI changes)
  useEffect(() => {
    if (drill && !originalDrill.current) {
      originalDrill.current = {
        title: drill.title,
        description: drill.description,
        sport: drill.sport,
        intensity: drill.intensity,
        setup: drill.setup ? JSON.parse(JSON.stringify(drill.setup)) : {},
        howItWorks: drill.howItWorks,
        coachingPoints: [...(drill.coachingPoints || [])],
        variations: [...(drill.variations || [])],
        commonMistakes: [...(drill.commonMistakes || [])],
      };
    }
  }, [drill]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [drill?.aiConversation]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!drill) return <div className="alert alert-danger">Drill not found</div>;

  const original = originalDrill.current || drill;
  const changedSections = SECTIONS.filter((s) =>
    hasChanged(original, drill, s.key, s.type)
  );

  const handleChatSend = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    setChatLoading(true);
    setError("");
    try {
      await refineDrill(id, chatMessage.trim());
      setChatMessage("");
      refetch();
    } catch {
      setError("AI refinement failed. Check your AI provider config.");
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

  const handleSave = async () => {
    setError("");

    // Check embedding similarity before saving
    if (drill.parentDrill && !similarityWarning) {
      setSaving(true);
      try {
        const res = await checkSimilarity(id, drill);
        if (!res.data.isSameDrill) {
          setSimilarityWarning(res.data.reason);
          setSaving(false);
          return;
        }
      } catch {
        // If similarity check fails, save anyway
      }
      setSaving(false);
    }

    navigate(`/drills/${id}`);
  };

  const handleSaveAsNew = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: drill.title,
        description: drill.description,
        sport: drill.sport,
        intensity: drill.intensity,
        setup: drill.setup,
        howItWorks: drill.howItWorks,
        coachingPoints: drill.coachingPoints,
        variations: drill.variations,
        commonMistakes: drill.commonMistakes,
        aiConversation: [
          { role: "user", content: `Forked from: ${original.title}` },
          { role: "assistant", content: "New drill created — changes were too significant to keep as a version." },
        ],
      };
      const res = await createDrill(payload);
      navigate(`/drills/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="refine-layout">
      {/* Main content: drill sections with change highlights */}
      <div className="refine-main">
        <div className="flex-between mb-1">
          <div>
            <h1 style={{ marginBottom: "0.25rem" }}>Refine: {drill.title}</h1>
            {drill.parentDrill && (
              <span className="text-sm text-muted">
                <FiGitBranch style={{ fontSize: "0.75rem" }} /> v{drill.version} of{" "}
                <Link to={`/drills/${drill.parentDrill._id || drill.parentDrill}`}>
                  {drill.parentDrill.title || "original"}
                </Link>
              </span>
            )}
          </div>
          <div className="flex gap-sm">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              <FiSave /> {saving ? "Checking..." : "Done — Save"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/drills/${id}`)}
            >
              <FiX /> Cancel
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Similarity warning */}
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
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSimilarityWarning(null); navigate(`/drills/${id}`); }}
                  >
                    Keep as Version Anyway
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSimilarityWarning(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change summary banner */}
        {changedSections.length > 0 && (
          <div className="refine-changes-banner mb-1">
            <strong>AI changed {changedSections.length} section{changedSections.length > 1 ? "s" : ""}:</strong>{" "}
            {changedSections.map((s) => s.label).join(", ")}
          </div>
        )}

        {/* Drill sections with change indicators */}
        {SECTIONS.map((section) => {
          const changed = hasChanged(original, drill, section.key, section.type);
          return (
            <div
              key={section.key}
              className={`card mb-1 refine-section ${changed ? "refine-section-changed" : ""}`}
            >
              <div className="refine-section-header">
                <h3>{section.label}</h3>
                {changed && <span className="refine-changed-badge">Changed</span>}
              </div>

              {changed ? (
                <div className="refine-diff">
                  <div className="refine-diff-old">
                    <div className="refine-diff-label">Before</div>
                    <SectionValue section={section} drill={original} />
                  </div>
                  <div className="refine-diff-arrow">
                    <FiArrowRight />
                  </div>
                  <div className="refine-diff-new">
                    <div className="refine-diff-label">After</div>
                    <SectionValue section={section} drill={drill} />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <SectionValue section={section} drill={drill} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Chat Panel — always visible */}
      <div className="chat-panel">
        <div className="chat-header">
          <h3>Refine with AI</h3>
          <p className="text-sm text-muted">
            Describe what you want to change. The AI will update the drill and you'll see the changes highlighted.
          </p>
        </div>
        <div className="chat-messages">
          {drill.aiConversation?.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
              <div className="chat-msg-label">{msg.role === "user" ? "You" : "AI"}</div>
              <div className="chat-msg-content">{msg.content}</div>
            </div>
          ))}
          {chatLoading && (
            <div className="chat-msg chat-msg-assistant">
              <div className="chat-msg-label">AI</div>
              <div className="chat-msg-content">
                <FiLoader className="spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input">
          <textarea
            className="form-control"
            placeholder="e.g. 'Make it harder by reducing space' or 'Add a goalkeeper'"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleChatKeyDown}
            rows={2}
          />
          <button
            className="btn btn-primary"
            onClick={handleChatSend}
            disabled={chatLoading || !chatMessage.trim()}
          >
            <FiSend /> {chatLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
