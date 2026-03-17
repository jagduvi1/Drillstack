import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { getDrill, deleteDrill, uploadDiagram, addReflection, retryEmbedding, toggleStar, forkDrill, getVersions, setDefaultVersion, findSimilar, convertToVersion } from "../api/drills";
import { refineDrill, generateDiagram } from "../api/ai";
import DebugPanel from "../components/common/DebugPanel";
import { FiEdit, FiTrash2, FiSend, FiMessageCircle, FiLoader, FiAlertCircle, FiRefreshCw, FiImage, FiStar, FiCopy, FiGitBranch, FiUser, FiCheck, FiLink, FiCode } from "react-icons/fi";

export default function DrillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.isSuperAdmin;
  const { data: drill, loading, refetch } = useFetch(() => getDrill(id), [id]);
  const [reflectionNote, setReflectionNote] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState(null);
  const [similarDrills, setSimilarDrills] = useState(null);
  const [similarDismissed, setSimilarDismissed] = useState(false);
  const [embeddingElapsed, setEmbeddingElapsed] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState([]);
  const similarChecked = useRef(false);
  const embeddingStartRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [drill?.aiConversation]);

  // Poll while embedding is pending/processing
  useEffect(() => {
    const active =
      drill?.embeddingStatus === "pending" ||
      drill?.embeddingStatus === "processing";
    if (!active) {
      embeddingStartRef.current = null;
      setEmbeddingElapsed(0);
      return;
    }
    if (!embeddingStartRef.current) embeddingStartRef.current = Date.now();
    const iv = setInterval(() => {
      refetch();
      setEmbeddingElapsed(Math.floor((Date.now() - embeddingStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [drill?.embeddingStatus, refetch]);

  // Check for similar drills once embedding is indexed (only for new drills without a parent)
  useEffect(() => {
    if (
      drill?.embeddingStatus === "indexed" &&
      !drill?.parentDrill &&
      !similarChecked.current &&
      !similarDismissed
    ) {
      similarChecked.current = true;
      findSimilar(id)
        .then((res) => {
          if (res.data.similar?.length > 0) {
            setSimilarDrills(res.data.similar);
          }
        })
        .catch(() => {}); // silently ignore
    }
  }, [drill?.embeddingStatus, drill?.parentDrill, id, similarDismissed]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!drill) return <div className="alert alert-danger">Drill not found</div>;

  const handleDelete = async () => {
    if (!window.confirm("Delete this drill?")) return;
    await deleteDrill(id);
    navigate("/drills");
  };

  const handleStar = async () => {
    await toggleStar(id);
    refetch();
  };

  const handleFork = async () => {
    const res = await forkDrill(id);
    navigate(`/drills/${res.data._id}/refine`);
  };

  const handleShowVersions = async () => {
    if (!showVersions) {
      const res = await getVersions(id);
      setVersions(res.data);
    }
    setShowVersions(!showVersions);
  };

  const handleSetDefault = async (versionId) => {
    await setDefaultVersion(versionId);
    const res = await getVersions(id);
    setVersions(res.data);
  };

  const handleDiagramUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("diagram", file);
    await uploadDiagram(id, fd);
    refetch();
  };

  const handleGenerateDiagram = async () => {
    setDiagramLoading(true);
    try {
      const res = await generateDiagram(id);
      if (res.data.debug) {
        setDebugEntries((prev) => [
          ...prev,
          { label: "Diagram Generation", debug: res.data.debug },
        ]);
      }
      refetch();
    } catch {
      alert("Diagram generation failed. Check your AI provider configuration.");
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleConvertToVersion = async (parentDrillId) => {
    try {
      await convertToVersion(id, parentDrillId);
      setSimilarDrills(null);
      refetch();
    } catch {
      alert("Failed to convert to version.");
    }
  };

  const handleDiscardDrill = async () => {
    if (!window.confirm("Delete this drill since it already exists?")) return;
    await deleteDrill(id);
    navigate("/drills");
  };

  const handleRetryEmbedding = async () => {
    await retryEmbedding(id);
    refetch();
  };

  const handleAddReflection = async () => {
    if (!reflectionNote.trim()) return;
    await addReflection(id, reflectionNote.trim());
    setReflectionNote("");
    refetch();
  };

  const handleChatSend = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    const msg = chatMessage.trim();
    setChatLoading(true);
    try {
      const res = await refineDrill(id, msg);
      if (res.data.debug) {
        setDebugEntries((prev) => [
          ...prev,
          { label: `Refine: "${msg.slice(0, 40)}${msg.length > 40 ? "..." : ""}"`, debug: res.data.debug },
        ]);
      }
      setChatMessage("");
      refetch();
    } catch {
      alert("AI refinement failed. Check your AI provider config.");
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

  return (
    <div className="drill-detail-layout">
      <div className="drill-detail-main">
        <div className="flex-between mb-1">
          <div>
            <h1 style={{ marginBottom: "0.25rem" }}>
              {drill.title}
              {drill.versionName && (
                <span className="version-name-subtitle"> — {drill.versionName}</span>
              )}
            </h1>
            <div className="flex gap-sm" style={{ alignItems: "center" }}>
              {drill.createdBy?.name && (
                <span className="text-sm text-muted"><FiUser style={{ fontSize: "0.75rem" }} /> {drill.createdBy.name}</span>
              )}
              {drill.parentDrill && (
                <span className="text-sm text-muted">
                  <FiGitBranch style={{ fontSize: "0.75rem" }} /> v{drill.version} of{" "}
                  <Link to={`/drills/${drill.parentDrill._id}`}>{drill.parentDrill.title}</Link>
                </span>
              )}
              {drill.versionCount > 1 && (
                <button className="btn-link text-sm" onClick={handleShowVersions}>
                  <FiGitBranch /> {drill.versionCount} versions
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-sm">
            <button
              className={`btn btn-sm ${drill.isStarred ? "btn-star-active" : "btn-secondary"}`}
              onClick={handleStar}
              title={drill.isStarred ? "Unstar" : "Star this drill"}
            >
              <FiStar /> {drill.isStarred ? "Starred" : "Star"}
            </button>
            {debugEntries.length > 0 && (
              <button
                className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDebugOpen(!debugOpen)}
              >
                <FiCode /> Debug ({debugEntries.length})
              </button>
            )}
            {drill.isOwner && (
              <button className="btn btn-secondary" onClick={() => setShowChat(!showChat)}>
                <FiMessageCircle /> {showChat ? "Hide Chat" : "Refine with AI"}
              </button>
            )}
            {drill.isOwner ? (
              <Link to={`/drills/${id}/edit`} className="btn btn-secondary"><FiEdit /> Edit</Link>
            ) : (
              <button className="btn btn-secondary" onClick={handleFork}><FiCopy /> Fork & Edit</button>
            )}
            {(drill.isOwner || isAdmin) && (
              <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> Delete</button>
            )}
          </div>
        </div>

        {/* Versions panel */}
        {showVersions && versions && (
          <div className="card mb-1">
            <h3>Versions</h3>
            <div className="versions-list">
              {versions.versions.map((v) => (
                <div key={v._id} className={`version-item ${v._id === id ? "version-item-current" : ""}`}>
                  <div className="flex-between">
                    <div>
                      <Link to={`/drills/${v._id}`}>
                        <strong>v{v.version}</strong>{v.versionName ? ` — ${v.versionName}` : ` — ${v.title}`}
                      </Link>
                      <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                        by {v.forkedBy?.name || v.createdBy?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex gap-sm">
                      {versions.defaultVersionId === v._id.toString() ? (
                        <span className="tag tag-success"><FiCheck /> Default</span>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSetDefault(v._id)}>
                          Set as default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Embedding status with progress */}
        {drill.embeddingStatus && drill.embeddingStatus !== "indexed" && (
          <div className="embedding-progress-detail mb-1">
            {drill.embeddingStatus === "failed" ? (
              <div className="flex-between">
                <span>
                  <FiAlertCircle style={{ color: "var(--color-danger)" }} /> Search indexing failed{isAdmin && drill.embeddingError ? `: ${drill.embeddingError}` : ""}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleRetryEmbedding}>
                  <FiRefreshCw /> Retry
                </button>
              </div>
            ) : (
              <>
                <div className="flex-between">
                  <span>
                    <FiLoader className="spin" />{" "}
                    {drill.embeddingStatus === "pending"
                      ? "Queued for search indexing..."
                      : "Indexing for search — checking for similar drills..."
                    }
                  </span>
                  <span className="text-sm text-muted embedding-timer">
                    {embeddingElapsed > 0 && `${embeddingElapsed}s`}
                    {embeddingElapsed < 25 && ` · ~${Math.max(0, 25 - embeddingElapsed)}s remaining`}
                  </span>
                </div>
                <div className="progress-bar" style={{ marginTop: "0.5rem" }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(95, (embeddingElapsed / 25) * 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted" style={{ marginTop: "0.35rem" }}>
                  Free tier — drills are indexed one at a time (~20-25s each)
                </p>
              </>
            )}
          </div>
        )}

        {/* Similar drills found — post-creation deduplication */}
        {similarDrills && similarDrills.length > 0 && (
          <div className="card mb-1 similar-drills-banner">
            <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
              <FiLink style={{ marginTop: "0.2rem", flexShrink: 0, color: "var(--color-primary)" }} />
              <div style={{ flex: 1 }}>
                <strong>Similar drills already exist</strong>
                <p className="text-sm text-muted" style={{ margin: "0.25rem 0 0.75rem" }}>
                  We found drills that look similar to this one. You can add yours as a version of an existing drill, keep it as a separate drill, or discard it.
                </p>
                {similarDrills.map((s) => (
                  <div key={s._id} className="similar-drill-item">
                    <div style={{ flex: 1 }}>
                      <Link to={`/drills/${s._id}`}>
                        <strong>{s.title}</strong>
                      </Link>
                      <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                        {Math.round(s.similarity * 100)}% similar
                      </span>
                      {s.description && (
                        <p className="text-sm text-muted" style={{ margin: "0.15rem 0 0" }}>
                          {s.description.slice(0, 100)}{s.description.length > 100 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleConvertToVersion(s._id)}
                    >
                      <FiGitBranch /> Add as Version
                    </button>
                  </div>
                ))}
                <div className="flex gap-sm mt-1">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSimilarDrills(null); setSimilarDismissed(true); }}
                  >
                    Keep as Separate Drill
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDiscardDrill}
                  >
                    <FiTrash2 /> Discard My Drill
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Panel */}
        {debugOpen && debugEntries.length > 0 && (
          <DebugPanel entries={debugEntries} />
        )}

        {/* Description & meta */}
        <div className="card mb-1">
          <h3>Description</h3>
          <p style={{ marginTop: "0.5rem" }}>{drill.description}</p>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {drill.sport && <span className="tag">{drill.sport}</span>}
            <span className={`tag tag-${drill.intensity === "high" ? "danger" : drill.intensity === "low" ? "" : "warning"}`}>{drill.intensity}</span>
            {drill.setup?.duration && <span className="tag">{drill.setup.duration}</span>}
          </div>
        </div>

        {/* Setup */}
        {(drill.setup?.players || drill.setup?.space || drill.setup?.equipment?.length > 0) && (
          <div className="card mb-1">
            <h3>Setup</h3>
            {drill.setup.players && <p style={{ marginTop: "0.5rem" }}><strong>Players:</strong> {drill.setup.players}</p>}
            {drill.setup.space && <p><strong>Space:</strong> {drill.setup.space}</p>}
            {drill.setup.equipment?.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Equipment:</strong>
                <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
                  {drill.setup.equipment.map((eq, i) => <span key={i} className="tag">{eq}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {drill.howItWorks && (
          <div className="card mb-1">
            <h3>How It Works</h3>
            <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{drill.howItWorks}</p>
          </div>
        )}

        {/* Coaching Points */}
        {drill.coachingPoints?.length > 0 && (
          <div className="card mb-1">
            <h3>Coaching Points</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.coachingPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Variations */}
        {drill.variations?.length > 0 && (
          <div className="card mb-1">
            <h3>Variations</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.variations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          </div>
        )}

        {/* Common Mistakes */}
        {drill.commonMistakes?.length > 0 && (
          <div className="card mb-1">
            <h3>Common Mistakes</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        {/* Diagrams */}
        <div className="card mb-1">
          <div className="flex-between">
            <h3>Diagrams</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleGenerateDiagram}
              disabled={diagramLoading}
            >
              {diagramLoading ? <><FiLoader className="spin" /> Generating...</> : <><FiImage /> Generate with AI</>}
            </button>
          </div>
          {diagramLoading && (
            <p className="text-sm text-muted mt-1">
              AI is creating a tactical diagram for this drill. This may take a few seconds...
            </p>
          )}
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {drill.diagrams?.map((d, i) => (
              <img key={i} src={d} alt={`Diagram ${i + 1}`} style={{ maxWidth: 400, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
            ))}
          </div>
          <div className="mt-1">
            <label className="text-sm text-muted" style={{ marginRight: "0.5rem" }}>Or upload your own:</label>
            <input type="file" accept="image/*" onChange={handleDiagramUpload} />
          </div>
        </div>

        {/* Reflection Notes */}
        <div className="card mb-1">
          <h3>Reflection Notes</h3>
          {drill.reflectionNotes?.map((r, i) => (
            <div key={i} className="section-block">
              <div className="text-sm text-muted">{new Date(r.date).toLocaleDateString()}</div>
              <p>{r.note}</p>
            </div>
          ))}
          <div className="flex gap-sm mt-1">
            <textarea className="form-control" placeholder="Add a reflection..." value={reflectionNote} onChange={(e) => setReflectionNote(e.target.value)} style={{ minHeight: 60 }} />
            <button className="btn btn-primary btn-sm" onClick={handleAddReflection}>Add</button>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>Refine with AI</h3>
            <p className="text-sm text-muted">Tell the AI how you want to change this drill</p>
          </div>
          <div className="chat-messages">
            {drill.aiConversation?.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                <div className="chat-msg-label">{msg.role === "user" ? "You" : "AI"}</div>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            ))}
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
      )}
    </div>
  );
}
