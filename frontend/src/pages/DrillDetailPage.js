import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { getDrill, deleteDrill, updateDrill, uploadDiagram, addReflection, retryEmbedding, toggleStar, forkDrill, getVersions, setDefaultVersion, findSimilar, convertToVersion } from "../api/drills";
import { refineDrill, generateDiagram } from "../api/ai";
import { getTactics } from "../api/tactics";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import DrillVersionsPanel from "../components/drills/DrillVersionsPanel";
import DrillEmbeddingStatus from "../components/drills/DrillEmbeddingStatus";
import SimilarDrillsBanner from "../components/drills/SimilarDrillsBanner";
import DrillChatPanel from "../components/drills/DrillChatPanel";
import { FiEdit, FiTrash2, FiMessageCircle, FiLoader, FiAlertCircle, FiImage, FiStar, FiCopy, FiGitBranch, FiUser, FiCode, FiTarget, FiPlus, FiSave } from "react-icons/fi";

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
  const [linkedTactics, setLinkedTactics] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(null); // refined fields not yet saved
  const [isSaving, setIsSaving] = useState(false);
  const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();
  const similarChecked = useRef(false);
  const embeddingStartRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch tactic boards linked to this drill
  useEffect(() => {
    if (!id) return;
    getTactics({ drill: id })
      .then((res) => setLinkedTactics(res.data.boards || []))
      .catch(() => {});
  }, [id]);

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

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    if (!unsavedChanges) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsavedChanges]);

  // Warn on route navigation with unsaved changes (must be before early returns)
  const blocker = useBlocker(!!unsavedChanges);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!drill) return <div className="alert alert-danger">{t("drills.notFound")}</div>;

  // Merge unsaved AI refinements with the fetched drill for display
  const displayDrill = unsavedChanges ? { ...drill, ...unsavedChanges } : drill;

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
      // If AI returned refined fields, apply locally (not saved yet)
      if (res.data.refinedFields) {
        setUnsavedChanges(res.data.refinedFields);
      }
      refetch(); // Refresh conversation history
    } catch {
      alert(t("drills.aiRefineFailed"));
    } finally {
      setChatLoading(false);
    }
  };

  // Save unsaved AI refinements
  const handleSaveRefinement = async () => {
    if (!unsavedChanges) return;
    setIsSaving(true);
    try {
      await updateDrill(id, unsavedChanges);
      setUnsavedChanges(null);
      refetch();
    } catch {
      alert(t("common.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // Discard unsaved refinements
  const handleDiscardRefinement = () => {
    if (!window.confirm(t("drills.discardChanges"))) return;
    setUnsavedChanges(null);
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
              {displayDrill.title}
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
            {drill.isOwner && (
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
            )}
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
          <DrillVersionsPanel
            versions={versions}
            currentDrillId={id}
            defaultVersionId={versions.defaultVersionId}
            onSetDefault={handleSetDefault}
          />
        )}

        {/* Embedding status with progress */}
        <DrillEmbeddingStatus
          drill={drill}
          embeddingElapsed={embeddingElapsed}
          isAdmin={isAdmin}
          onRetry={handleRetryEmbedding}
        />

        {/* Similar drills found — post-creation deduplication */}
        <SimilarDrillsBanner
          similarDrills={similarDrills}
          onConvertToVersion={handleConvertToVersion}
          onDismiss={() => { setSimilarDrills(null); setSimilarDismissed(true); }}
          onDiscard={handleDiscardDrill}
        />

        {/* Debug Panel */}
        {debugOpen && debugEntries.length > 0 && (
          <DebugPanel entries={debugEntries} />
        )}

        {/* Unsaved changes banner */}
        {unsavedChanges && (
          <div className="alert alert-warning mb-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span><FiAlertCircle style={{ marginRight: "0.4rem" }} />{t("drills.unsavedChanges")}</span>
            <div className="flex gap-sm">
              <button className="btn btn-primary btn-sm" onClick={handleSaveRefinement} disabled={isSaving}>
                <FiSave /> {isSaving ? t("common.saving") : t("common.save")}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDiscardRefinement}>
                {t("common.discard")}
              </button>
            </div>
          </div>
        )}

        {/* Navigation blocker modal */}
        {blocker.state === "blocked" && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 400, textAlign: "center" }}>
              <h3 style={{ marginBottom: "1rem" }}>{t("drills.unsavedChangesTitle")}</h3>
              <p className="text-muted" style={{ marginBottom: "1.5rem" }}>{t("drills.unsavedChangesMessage")}</p>
              <div className="flex gap-sm" style={{ justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => { handleSaveRefinement().then(() => blocker.proceed()); }}>
                  <FiSave /> {t("common.save")}
                </button>
                <button className="btn btn-danger" onClick={() => blocker.proceed()}>
                  {t("drills.leaveWithoutSaving")}
                </button>
                <button className="btn btn-secondary" onClick={() => blocker.reset()}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Description & meta */}
        <div className="card mb-1">
          <h3>{t("drills.description")}</h3>
          <p style={{ marginTop: "0.5rem" }}>{displayDrill.description}</p>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {displayDrill.sport && <span className="tag">{displayDrill.sport}</span>}
            <span className={`tag tag-${displayDrill.intensity === "high" ? "danger" : displayDrill.intensity === "low" ? "" : "warning"}`}>{displayDrill.intensity}</span>
            {displayDrill.setup?.duration && <span className="tag">{displayDrill.setup.duration}</span>}
          </div>
        </div>

        {/* Setup */}
        {(displayDrill.setup?.players || displayDrill.setup?.space || displayDrill.setup?.equipment?.length > 0) && (
          <div className="card mb-1">
            <h3>{t("drills.setup")}</h3>
            {displayDrill.setup.players && <p style={{ marginTop: "0.5rem" }}><strong>{t("drills.players")}</strong> {displayDrill.setup.players}</p>}
            {displayDrill.setup.space && <p><strong>{t("drills.space")}</strong> {displayDrill.setup.space}</p>}
            {displayDrill.setup.equipment?.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>{t("drills.equipment")}</strong>
                <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
                  {displayDrill.setup.equipment.map((eq, i) => <span key={i} className="tag">{eq}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {displayDrill.howItWorks && (
          <div className="card mb-1">
            <h3>{t("drills.howItWorks")}</h3>
            <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{displayDrill.howItWorks}</p>
          </div>
        )}

        {/* Coaching Points */}
        {displayDrill.coachingPoints?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.coachingPoints")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {displayDrill.coachingPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Variations */}
        {displayDrill.variations?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.variations")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {displayDrill.variations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          </div>
        )}

        {/* Common Mistakes */}
        {displayDrill.commonMistakes?.length > 0 && (
          <div className="card mb-1">
            <h3>{t("drills.commonMistakes")}</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {displayDrill.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
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

        {/* Linked Tactic Boards */}
        <div className="card mb-1">
          <div className="flex-between">
            <h3><FiTarget style={{ marginRight: "0.4rem" }} />{t("drills.tacticBoards")}</h3>
            {drill.isOwner && (
              <Link
                to={`/tactics/new?${new URLSearchParams({ drillDescription: [drill.description, drill.howItWorks].filter(Boolean).join("\n\n"), drillTitle: drill.title || "", drillId: id }).toString()}`}
                className="btn btn-primary btn-sm"
              >
                <FiPlus /> {t("drills.newTacticBoard")}
              </Link>
            )}
          </div>
          {linkedTactics === null ? (
            <p className="text-sm text-muted mt-1"><FiLoader className="spin" /> {t("common.loading")}</p>
          ) : linkedTactics.length === 0 ? (
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
        <DrillChatPanel
          drill={drill}
          chatMessage={chatMessage}
          chatLoading={chatLoading}
          onMessageChange={setChatMessage}
          onSend={handleChatSend}
          onKeyDown={handleChatKeyDown}
          chatEndRef={chatEndRef}
        />
      )}
    </div>
  );
}
