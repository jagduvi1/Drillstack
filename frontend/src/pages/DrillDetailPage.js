import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupContext";
import { getDrill, deleteDrill, updateDrill, uploadDiagram, addReflection, retryEmbedding, toggleStar, forkDrill, getVersions, setDefaultVersion, findSimilar, convertToVersion, claimDrill } from "../api/drills";
import { toggleGroupStar } from "../api/groups";
import { cloneTactic } from "../api/tactics";
import { getContributions, addVideo, addDrawing, deleteContribution } from "../api/contributions";
import { submitReport } from "../api/reports";
import { refineDrill } from "../api/ai";
import { getTactics } from "../api/tactics";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import DrillVersionsPanel from "../components/drills/DrillVersionsPanel";
import DrillEmbeddingStatus from "../components/drills/DrillEmbeddingStatus";
import SimilarDrillsBanner from "../components/drills/SimilarDrillsBanner";
import DrillChatPanel from "../components/drills/DrillChatPanel";
import { FiEdit, FiTrash2, FiMessageCircle, FiLoader, FiAlertCircle, FiStar, FiCopy, FiGitBranch, FiUser, FiCode, FiTarget, FiPlus, FiSave, FiVideo, FiImage, FiFlag } from "react-icons/fi";

export default function DrillDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, getUserRole } = useGroups();
  const isAdmin = user?.role === "admin" || user?.isSuperAdmin;
  const { data: drill, loading, refetch } = useFetch(() => getDrill(id), [id]);
  const [reflectionNote, setReflectionNote] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showStarMenu, setShowStarMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState(null);
  const [similarDrills, setSimilarDrills] = useState(null);
  const [similarDismissed, setSimilarDismissed] = useState(false);
  const [embeddingElapsed, setEmbeddingElapsed] = useState(0);
  const [linkedTactics, setLinkedTactics] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(null); // refined fields not yet saved
  const [isSaving, setIsSaving] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoVisibility, setVideoVisibility] = useState("public");
  const [videoGroup, setVideoGroup] = useState("");
  const [showAddVideo, setShowAddVideo] = useState(false);
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

  const fetchContributions = useCallback(() => {
    if (!id) return;
    getContributions(id)
      .then((res) => setContributions(res.data))
      .catch(() => {});
  }, [id]);
  useEffect(() => { fetchContributions(); }, [fetchContributions]);

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

  // Check for similar drills once embedding is indexed (only for standalone drills with no versions)
  useEffect(() => {
    if (
      drill?.embeddingStatus === "indexed" &&
      !drill?.parentDrill &&
      drill?.versionCount <= 1 &&
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
  }, [drill?.embeddingStatus, drill?.parentDrill, drill?.versionCount, id, similarDismissed]);

  // Close star menu on outside click
  useEffect(() => {
    if (!showStarMenu) return;
    const close = () => setShowStarMenu(false);
    const timer = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [showStarMenu]);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    if (!unsavedChanges) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsavedChanges]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!drill) return <div className="alert alert-danger">{t("drills.notFound")}</div>;

  // Merge unsaved AI refinements with the fetched drill for display
  const displayDrill = unsavedChanges ? { ...drill, ...unsavedChanges } : drill;

  const handleDelete = async () => {
    if (!window.confirm(t("drills.deleteDrill"))) return;
    const res = await deleteDrill(id);
    if (res.data.pendingDeletion) {
      refetch(); // Refresh to show pending deletion banner
    } else {
      navigate("/drills");
    }
  };

  const handleClaim = async () => {
    try {
      await claimDrill(id);
      refetch();
    } catch { /* ignore */ }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    try {
      await addVideo(id, {
        url: videoUrl,
        title: videoTitle,
        visibility: videoVisibility,
        group: videoVisibility === "group" ? videoGroup : undefined,
      });
      setVideoUrl("");
      setVideoTitle("");
      setVideoVisibility("public");
      setShowAddVideo(false);
      fetchContributions();
    } catch { /* ignore */ }
  };

  const handleAddDrawing = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("drawing", file);
    fd.append("visibility", "public");
    try {
      await addDrawing(id, fd);
      fetchContributions();
    } catch { /* ignore */ }
    e.target.value = "";
  };

  const handleDeleteContribution = async (contribId) => {
    if (!window.confirm(t("drills.deleteContribution"))) return;
    try {
      await deleteContribution(contribId);
      fetchContributions();
    } catch { /* ignore */ }
  };

  const handleReport = async (targetType, targetId) => {
    const reason = window.prompt(t("drills.reportReason"));
    if (!reason?.trim()) return;
    try {
      await submitReport({ targetType, targetId, reason });
      alert(t("drills.reportSubmitted"));
    } catch { /* ignore */ }
  };

  const handleStar = async () => {
    await toggleStar(id);
    refetch();
    setShowStarMenu(false);
  };

  const handleGroupStar = async (groupId) => {
    await toggleGroupStar(groupId, id);
    refetch();
    setShowStarMenu(false);
  };

  const handleCloneTactic = async (tacticId) => {
    try {
      const res = await cloneTactic(tacticId);
      navigate(`/tactics/${res.data._id}`);
    } catch { /* ignore */ }
  };

  // Groups where user is admin/trainer (can star for group)
  const starableGroups = groups.filter((g) => {
    const role = getUserRole(g._id);
    return role === "admin" || role === "trainer";
  });

  const handleFork = async () => {
    const res = await forkDrill(id);
    navigate(`/drills/${res.data._id}/edit`);
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
            <div style={{ position: "relative" }}>
              <button
                className={`btn btn-sm ${drill.isStarred ? "btn-star-active" : "btn-secondary"}`}
                onClick={starableGroups.length > 0 ? () => setShowStarMenu(!showStarMenu) : handleStar}
                title={drill.isStarred ? t("drills.unstar") : t("drills.starThisDrill")}
              >
                <FiStar /> {drill.isStarred ? t("drills.starred") : t("drills.star")}
              </button>
              {showStarMenu && starableGroups.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, zIndex: 20, marginTop: "0.25rem",
                  background: "var(--color-card)", border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)", minWidth: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}>
                  <button className="star-menu-item" onClick={handleStar}>
                    <FiUser style={{ marginRight: "0.4rem" }} /> {t("drills.starForMe")}
                  </button>
                  {starableGroups.map((g) => (
                    <button key={g._id} className="star-menu-item" onClick={() => handleGroupStar(g._id)}>
                      {g.type === "club" ? "🏢" : "👥"} {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

        {/* Pending deletion banner */}
        {drill.pendingDeletion && (
          <div className="alert alert-warning mb-1">
            <div className="flex-between" style={{ alignItems: "center" }}>
              <span>
                <FiAlertCircle style={{ marginRight: "0.4rem" }} />
                {drill.isOwner
                  ? t("drills.pendingDeletionOwner", { days: Math.max(0, 30 - Math.floor((Date.now() - new Date(drill.deletionRequestedAt)) / 86400000)) })
                  : t("drills.pendingDeletionOther")}
              </span>
              {!drill.isOwner && (
                <button className="btn btn-primary btn-sm" style={{ marginLeft: "1rem", whiteSpace: "nowrap" }} onClick={handleClaim}>
                  {t("drills.claimDrill")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Read-only banner for non-owners */}
        {!drill.isOwner && !drill.pendingDeletion && (
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
            isAdmin={isAdmin}
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
          <h3>{t("drills.diagrams")}</h3>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {drill.diagrams?.map((d, i) => (
              <img key={i} src={d} alt={`Diagram ${i + 1}`} style={{ maxWidth: 400, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
            ))}
          </div>
          {drill.isOwner ? (
            <div className="mt-1">
              <label className="text-sm text-muted" style={{ marginRight: "0.5rem" }}>{t("drills.uploadDiagram")}</label>
              <input type="file" accept="image/*,.pdf" onChange={handleDiagramUpload} />
            </div>
          ) : (
            <p className="text-sm text-muted mt-1">
              <FiCopy style={{ marginRight: "0.3rem" }} />
              {t("drills.diagramsReadOnly")}{" "}
              <button className="btn-link" onClick={handleFork}>{t("drills.forkAndEdit")}</button>
            </p>
          )}
        </div>

        {/* User Contributions (Videos & Drawings) */}
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
            <h3><FiVideo style={{ marginRight: "0.4rem" }} />{t("drills.contributions")}</h3>
            <div className="flex gap-sm">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddVideo(!showAddVideo)}>
                <FiVideo /> {t("drills.addVideo")}
              </button>
              <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", margin: 0 }}>
                <FiImage /> {t("drills.addDrawing")}
                <input type="file" accept="image/*,.pdf" onChange={handleAddDrawing} style={{ display: "none" }} />
              </label>
              <button className="btn btn-secondary btn-sm" onClick={() => handleReport("drill", id)} title={t("drills.reportDrill")}>
                <FiFlag />
              </button>
            </div>
          </div>

          {/* Add video form */}
          {showAddVideo && (
            <form onSubmit={handleAddVideo} className="card mb-1" style={{ background: "var(--color-bg)" }}>
              <div className="form-group">
                <input className="form-control" placeholder={t("drills.videoUrlPlaceholder")} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
              </div>
              <div className="flex gap-sm">
                <input className="form-control" placeholder={t("drills.videoTitlePlaceholder")} value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} style={{ flex: 1 }} />
                <select className="form-control" value={videoVisibility} onChange={(e) => setVideoVisibility(e.target.value)} style={{ width: "auto" }}>
                  <option value="public">{t("drills.visPublic")}</option>
                  <option value="private">{t("drills.visPrivate")}</option>
                  <option value="group">{t("drills.visGroup")}</option>
                </select>
                {videoVisibility === "group" && groups.length > 0 && (
                  <select className="form-control" value={videoGroup} onChange={(e) => setVideoGroup(e.target.value)} style={{ width: "auto" }}>
                    <option value="">{t("drills.selectGroup")}</option>
                    {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                )}
                <button type="submit" className="btn btn-primary btn-sm"><FiPlus /></button>
              </div>
            </form>
          )}

          {/* Contributions list */}
          {contributions.length === 0 ? (
            <p className="text-sm text-muted">{t("drills.noContributions")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {contributions.map((c) => (
                <div key={c._id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem",
                }}>
                  <div style={{ flex: 1 }}>
                    {c.type === "video" ? (
                      <div>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm">
                          <FiVideo style={{ marginRight: "0.3rem" }} />
                          {c.title || c.url}
                        </a>
                      </div>
                    ) : (
                      <div>
                        <a href={c.filePath} target="_blank" rel="noopener noreferrer">
                          <img src={c.filePath} alt={c.title || "Drawing"} style={{ maxWidth: 200, borderRadius: "var(--radius)" }} />
                        </a>
                      </div>
                    )}
                    <div className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                      {c.createdBy?.name}
                      {c.visibility !== "public" && (
                        <span className="tag" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                          {c.visibility === "private" ? t("drills.visPrivate") : c.group?.name || t("drills.visGroup")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleReport("contribution", c._id)} title={t("drills.report")}>
                      <FiFlag />
                    </button>
                    {c.createdBy?._id === user._id && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContribution(c._id)}>
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                <div key={tb._id} className="drill-tactic-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link to={`/tactics/${tb._id}`} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
                    <div>
                      <strong>{tb.title || t("tactics.untitled")}</strong>
                      <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                        {tb.fieldType} · {tb.homeTeam?.formation || "4-4-2"} vs {tb.awayTeam?.formation || "4-4-2"}
                      </span>
                    </div>
                  </Link>
                  <div className="flex gap-sm" style={{ alignItems: "center" }}>
                    <span className="text-sm text-muted">{new Date(tb.updatedAt).toLocaleDateString()}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleCloneTactic(tb._id)} title={t("drills.cloneTactic")}>
                      <FiCopy />
                    </button>
                  </div>
                </div>
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
