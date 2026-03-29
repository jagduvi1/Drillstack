import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { getDrill, deleteDrill, uploadDiagram, addReflection, retryEmbedding, toggleStar, forkDrill, getVersions, setDefaultVersion, findSimilar, convertToVersion } from "../api/drills";
import { refineDrill, generateDiagram } from "../api/ai";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import { FiEdit, FiTrash2, FiSend, FiMessageCircle, FiLoader, FiAlertCircle, FiRefreshCw, FiImage, FiStar, FiCopy, FiGitBranch, FiUser, FiCheck, FiLink, FiCode, FiTarget } from "react-icons/fi";

export default function DrillDetailPage() {
  const { t } = useTranslation();
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
  const [diagramError, setDiagramError] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState(null);
  const [similarDrills, setSimilarDrills] = useState(null);
  const [similarDismissed, setSimilarDismissed] = useState(false);
  const [embeddingElapsed, setEmbeddingElapsed] = useState(0);
  const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();
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
    let mounted = true;
    const iv = setInterval(() => {
      if (!mounted) return;
      refetch();
      setEmbeddingElapsed(Math.floor((Date.now() - embeddingStartRef.current) / 1000));
    }, 1000);
    return () => { mounted = false; clearInterval(iv); };
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

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!drill) return <div className="alert alert-danger">{t("drills.notFound")}</div>;

  const handleDelete = async () => {
    if (!window.confirm(t("drills.deleteDrill"))) return;
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
    setDiagramError("");
    try {
      const res = await generateDiagram(id);
      if (res.data.debug) {
        addDebugEntry("Diagram Generation", res.data.debug);
      }
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t("drills.diagramGenFailed");
      setDiagramError(msg);
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
      alert(t("drills.failedToConvert"));
    }
  };

  const handleDiscardDrill = async () => {
    if (!window.confirm(t("drills.deleteExistingConfirm"))) return;
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
        addDebugEntry(`Refine: "${msg.slice(0, 40)}${msg.length > 40 ? "..." : ""}"`, res.data.debug);
      }
      setChatMessage("");
      refetch();
    } catch {
      alert(t("drills.aiRefineFailed"));
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
                  <FiGitBranch /> {t("drills.version_count", { count: drill.versionCount })}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-sm">
            <button
              className={`btn btn-sm ${drill.isStarred ? "btn-star-active" : "btn-secondary"}`}
              onClick={handleStar}
              title={drill.isStarred ? t("drills.unstar") : t("drills.starThisDrill")}
            >
              <FiStar /> {drill.isStarred ? t("drills.starred") : t("drills.star")}
            </button>
            {debugEntries.length > 0 && (
              <button
                className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"}`}
                onClick={toggleDebug}
              >
                <FiCode /> Debug ({debugEntries.length})
              </button>
            )}
            {drill.isOwner && (
              <button className="btn btn-secondary" onClick={() => setShowChat(!showChat)}>
                <FiMessageCircle /> {showChat ? t("drills.hideChat") : t("drills.refineWithAi")}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => {
                const desc = [drill.description, drill.howItWorks].filter(Boolean).join("\n\n");
                const params = new URLSearchParams({
                  drillDescription: desc,
                  drillTitle: drill.title || "",
                  drillId: id,
                });
                navigate(`/tactics/new?${params.toString()}`);
              }}
              title={t("drills.generateTacticBoard")}
            >
              <FiTarget /> {t("drills.generateTacticBoard")}
            </button>
            {drill.isOwner ? (
              <Link to={`/drills/${id}/edit`} className="btn btn-secondary"><FiEdit /> {t("common.edit")}</Link>
            ) : (
              <button className="btn btn-secondary" onClick={handleFork}><FiCopy /> {t("drills.forkAndEdit")}</button>
            )}
            {(drill.isOwner || isAdmin) && (
              <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> {t("common.delete")}</button>
            )}
          </div>
        </div>

        {/* Read-only banner for non-owners */}
        {!drill.isOwner && (
          <div className="alert alert-info flex-between mb-1" style={{ alignItems: "center" }}>
            <span><FiAlertCircle style={{ marginRight: "0.4rem" }} />{t("drills.readOnlyBanner")}</span>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: "1rem", whiteSpace: "nowrap" }} onClick={handleFork}>
              <FiCopy /> {t("drills.forkAndEdit")}
            </button>
          </div>
        )}

        {/* Versions panel */}
        {showVersions && versions && (
          <div className="card mb-1">
            <h3>{t("drills.versions")}</h3>
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
                        <span className="tag tag-success"><FiCheck /> {t("drills.default")}</span>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSetDefault(v._id)}>
                          {t("drills.setAsDefault")}
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
                  <FiAlertCircle style={{ color: "var(--color-danger)" }} /> {t("drills.searchIndexingFailed")}{isAdmin && drill.embeddingError ? `: ${drill.embeddingError}` : ""}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleRetryEmbedding}>
                  <FiRefreshCw /> {t("drills.retry")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex-between">
                  <span>
                    <FiLoader className="spin" />{" "}
                    {drill.embeddingStatus === "pending"
                      ? t("drills.queuedForIndexing")
                      : t("drills.indexingForSearch")
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
                  {t("drills.freeTierNote")}
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
                <strong>{t("drills.similarDrillsExist")}</strong>
                <p className="text-sm text-muted" style={{ margin: "0.25rem 0 0.75rem" }}>
                  {t("drills.similarDrillsDesc")}
                </p>
                {similarDrills.map((s) => (
                  <div key={s._id} className="similar-drill-item">
                    <div style={{ flex: 1 }}>
                      <Link to={`/drills/${s._id}`}>
                        <strong>{s.title}</strong>
                      </Link>
                      <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                        {t("drills.similar", { pct: Math.round(s.similarity * 100) })}
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
                      <FiGitBranch /> {t("drills.addAsVersion")}
                    </button>
                  </div>
                ))}
                <div className="flex gap-sm mt-1">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSimilarDrills(null); setSimilarDismissed(true); }}
                  >
                    {t("drills.keepAsSeparate")}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDiscardDrill}
                  >
                    <FiTrash2 /> {t("drills.discardMyDrill")}
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
          <h3>{t("drills.description")}</h3>
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
            <h3>{t("drills.setup")}</h3>
            {drill.setup.players && <p style={{ marginTop: "0.5rem" }}><strong>{t("drills.players")}</strong> {drill.setup.players}</p>}
            {drill.setup.space && <p><strong>{t("drills.space")}</strong> {drill.setup.space}</p>}
            {drill.setup.equipment?.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>{t("drills.equipment")}</strong>
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
            <h3>{t("drills.howItWorks")}</h3>
            <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{drill.howItWorks}</p>
          </div>
        )}

        {/* Coaching Points */}
        {drill.coachingPoints?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.coachingPoints")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.coachingPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Variations */}
        {drill.variations?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.variations")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.variations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          </div>
        )}

        {/* Common Mistakes */}
        {drill.commonMistakes?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.commonMistakes")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {drill.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        {/* Diagrams */}
        <div className="card mb-1">
          <div className="flex-between">
            <h3>{t("drills.diagrams")}</h3>
            {drill.isOwner && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleGenerateDiagram}
                disabled={diagramLoading}
              >
                {diagramLoading ? <><FiLoader className="spin" /> {t("drills.generating")}</> : <><FiImage /> {t("drills.generateWithAi")}</>}
              </button>
            )}
          </div>
          {diagramLoading && (
            <p className="text-sm text-muted mt-1">
              {t("drills.aiCreatingDiagram")}
            </p>
          )}
          {diagramError && (
            <p className="text-sm mt-1" style={{ color: "var(--color-danger, #ef4444)" }}>
              {diagramError}
            </p>
          )}
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {drill.diagrams?.map((d, i) => (
              <img key={i} src={d} alt={`Diagram ${i + 1}`} style={{ maxWidth: 400, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
            ))}
          </div>
          {drill.isOwner ? (
            <div className="mt-1">
              <label className="text-sm text-muted" style={{ marginRight: "0.5rem" }}>{t("drills.uploadYourOwn")}</label>
              <input type="file" accept="image/*" onChange={handleDiagramUpload} />
            </div>
          ) : (
            <p className="text-sm text-muted mt-1">
              <FiCopy style={{ marginRight: "0.3rem" }} />
              {t("drills.diagramsReadOnly")}{" "}
              <button className="btn-link" onClick={handleFork}>{t("drills.forkAndEdit")}</button>
            </p>
          )}
        </div>

        {/* Reflection Notes */}
        <div className="card mb-1">
          <h3>{t("drills.reflectionNotes")}</h3>
          {drill.reflectionNotes?.map((r, i) => (
            <div key={i} className="section-block">
              <div className="text-sm text-muted">{new Date(r.date).toLocaleDateString()}</div>
              <p>{r.note}</p>
            </div>
          ))}
          <div className="flex gap-sm mt-1">
            <textarea className="form-control" placeholder={t("drills.addReflection")} value={reflectionNote} onChange={(e) => setReflectionNote(e.target.value)} style={{ minHeight: 60 }} />
            <button className="btn btn-primary btn-sm" onClick={handleAddReflection}>{t("common.add")}</button>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>{t("drills.refineWithAi")}</h3>
            <p className="text-sm text-muted">{t("drills.tellAiChange")}</p>
          </div>
          <div className="chat-messages">
            {drill.aiConversation?.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                <div className="chat-msg-label">{msg.role === "user" ? t("common.you") : t("common.ai")}</div>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <textarea
              className="form-control"
              placeholder={t("drills.chatPlaceholder")}
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
              <FiSend /> {chatLoading ? "..." : t("drills.send")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
