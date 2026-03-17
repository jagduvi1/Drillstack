import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getDrill, checkSimilarity, createDrill, updateDrill } from "../api/drills";
import { refineDrill } from "../api/ai";
import { FiSend, FiSave, FiX, FiLoader, FiGitBranch, FiAlertCircle } from "react-icons/fi";

// ── Word-level diff ─────────────────────────────────────────────────────────
// Uses LCS to produce inline highlights: removed (red strikethrough) and added (green)
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

function wordDiff(oldText, newText) {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: "add", text: newText }];
  if (!newText) return [{ type: "del", text: oldText }];
  if (oldText === newText) return [{ type: "same", text: oldText }];

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const common = lcs(oldWords, newWords);

  const ops = [];
  let oi = 0, ni = 0, ci = 0;

  while (ci < common.length) {
    const delWords = [];
    while (oi < oldWords.length && oldWords[oi] !== common[ci]) delWords.push(oldWords[oi++]);
    const addWords = [];
    while (ni < newWords.length && newWords[ni] !== common[ci]) addWords.push(newWords[ni++]);

    if (delWords.length) ops.push({ type: "del", text: delWords.join("") });
    if (addWords.length) ops.push({ type: "add", text: addWords.join("") });
    ops.push({ type: "same", text: common[ci] });
    oi++; ni++; ci++;
  }
  // Remaining
  const delTail = oldWords.slice(oi);
  const addTail = newWords.slice(ni);
  if (delTail.length) ops.push({ type: "del", text: delTail.join("") });
  if (addTail.length) ops.push({ type: "add", text: addTail.join("") });

  return ops;
}

function InlineDiff({ oldText, newText }) {
  const ops = wordDiff(oldText || "", newText || "");
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {ops.map((op, i) => {
        if (op.type === "del") return <span key={i} className="diff-del">{op.text}</span>;
        if (op.type === "add") return <span key={i} className="diff-add">{op.text}</span>;
        return <span key={i}>{op.text}</span>;
      })}
    </span>
  );
}

// ── Sections config ─────────────────────────────────────────────────────────
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

// ── Diff-aware section renderers ────────────────────────────────────────────

function SetupDiff({ oldSetup, newSetup }) {
  const o = oldSetup || {};
  const n = newSetup || {};
  const fields = [
    { label: "Players", key: "players" },
    { label: "Space", key: "space" },
    { label: "Duration", key: "duration" },
  ];
  return (
    <div>
      {fields.map((f) => {
        if (!o[f.key] && !n[f.key]) return null;
        return (
          <p key={f.key}>
            <strong>{f.label}:</strong>{" "}
            <InlineDiff oldText={o[f.key] || ""} newText={n[f.key] || ""} />
          </p>
        );
      })}
      {(o.equipment?.length > 0 || n.equipment?.length > 0) && (
        <p>
          <strong>Equipment:</strong>{" "}
          <InlineDiff
            oldText={(o.equipment || []).join(", ")}
            newText={(n.equipment || []).join(", ")}
          />
        </p>
      )}
    </div>
  );
}

function ListDiff({ oldList, newList }) {
  const o = oldList || [];
  const n = newList || [];
  const maxLen = Math.max(o.length, n.length);
  if (maxLen === 0) return <span className="text-muted">-</span>;

  return (
    <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
      {Array.from({ length: maxLen }, (_, i) => {
        const oldItem = o[i];
        const newItem = n[i];
        if (oldItem === undefined) {
          // Added item
          return <li key={i}><span className="diff-add">{newItem}</span></li>;
        }
        if (newItem === undefined) {
          // Removed item
          return <li key={i}><span className="diff-del">{oldItem}</span></li>;
        }
        if (oldItem === newItem) {
          return <li key={i}>{newItem}</li>;
        }
        return <li key={i}><InlineDiff oldText={oldItem} newText={newItem} /></li>;
      })}
    </ul>
  );
}

function SectionContent({ section, original, current, changed }) {
  if (!changed) {
    // Unchanged — render current value plainly
    if (section.type === "setup") {
      const s = current.setup || {};
      return (
        <div>
          {s.players && <p><strong>Players:</strong> {s.players}</p>}
          {s.space && <p><strong>Space:</strong> {s.space}</p>}
          {s.duration && <p><strong>Duration:</strong> {s.duration}</p>}
          {s.equipment?.length > 0 && <p><strong>Equipment:</strong> {s.equipment.join(", ")}</p>}
        </div>
      );
    }
    if (section.type === "list") {
      const items = current[section.key] || [];
      if (!items.length) return <span className="text-muted">-</span>;
      return (
        <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    return <span style={{ whiteSpace: "pre-wrap" }}>{current[section.key] || <span className="text-muted">-</span>}</span>;
  }

  // Changed — render with inline diff highlights
  if (section.type === "setup") {
    return <SetupDiff oldSetup={original.setup} newSetup={current.setup} />;
  }
  if (section.type === "list") {
    return <ListDiff oldList={original[section.key]} newList={current[section.key]} />;
  }
  return <InlineDiff oldText={original[section.key] || ""} newText={current[section.key] || ""} />;
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DrillRefinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: drill, loading, refetch } = useFetch(() => getDrill(id), [id]);

  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const [versionName, setVersionName] = useState("");
  const chatEndRef = useRef(null);
  const originalDrill = useRef(null);

  // Capture the original drill state on first load and init version name
  useEffect(() => {
    if (drill && !originalDrill.current) {
      setVersionName(drill.versionName || "");
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

    // Save version name if set
    if (versionName.trim() !== (drill.versionName || "")) {
      try {
        await updateDrill(id, { versionName: versionName.trim() });
      } catch { /* ignore */ }
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
      {/* Main content: drill sections with inline change highlights */}
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

        {/* Version name input */}
        <div className="card mb-1">
          <label style={{ fontWeight: 600, marginBottom: "0.35rem", display: "block" }}>
            Name your version
          </label>
          <p className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
            Give this version a short name to distinguish it, e.g. "Med halvtidsbyte" or "Utan kö"
          </p>
          <input
            className="form-control"
            placeholder="e.g. Enklare variant, Med målvakt..."
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            style={{ maxWidth: 400 }}
          />
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

        {/* Drill sections with inline diff highlights */}
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
              <div style={{ marginTop: "0.5rem" }}>
                <SectionContent
                  section={section}
                  original={original}
                  current={drill}
                  changed={changed}
                />
              </div>
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
