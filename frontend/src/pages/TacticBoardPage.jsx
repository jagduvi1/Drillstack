import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import {
  FiArrowLeft, FiSave,
  FiTrash2, FiPlus, FiPlay, FiPause, FiSkipBack, FiSkipForward,
  FiRepeat, FiZoomIn, FiZoomOut,
  FiMaximize, FiMinimize, FiTarget, FiEye, FiEdit3,
} from "react-icons/fi";
import TacticCanvas, {
  FORMATIONS, DRAW_TOOLS, createInitialStep, buildFormationPieces,
  SPORT_CONFIGS, SPORT_FORMATIONS, getFormations, getDefaultFormation, getPitch,
} from "../components/tactics/TacticCanvas";
import TacticToolbar from "../components/tactics/TacticToolbar";
import { getTactic, createTactic, updateTactic } from "../api/tactics";
import { useAuth } from "../context/AuthContext";

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function TacticBoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isNew = !id;

  // ── Board state ─────────────────────────────────────────────────────────
  const [sport, setSport] = useState(() => {
    // Default to user's preferred sport if set
    return user?.preferredSport || "football";
  });
  const [title, setTitle] = useState("");
  const [fieldType, setFieldType] = useState("full");
  const [steps, setSteps] = useState([createInitialStep()]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [homeFormation, setHomeFormation] = useState("4-4-2");
  const [awayFormation, setAwayFormation] = useState("4-4-2");
  const [homeColor, setHomeColor] = useState("#2563eb");
  const [awayColor, setAwayColor] = useState("#ef4444");
  const [drillId, setDrillId] = useState(null);
  const [drillTitle, setDrillTitle] = useState("");
  const [isOwner, setIsOwner] = useState(isNew); // New boards are owned by creator
  const [loading, setLoading] = useState(!isNew);

  // ── UI state ────────────────────────────────────────────────────────────
  const [tool, setTool] = useState("select");
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const [zoom, setZoom] = useState(1);

  // ── Coach mode (interactive whiteboard — no editing, just show & draw) ──
  const [coachMode, setCoachMode] = useState(false);

  // ── Fullscreen presentation mode ────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef(null);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      const el = fullscreenRef.current;
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Sync state when user exits fullscreen via Escape/browser UI
  useEffect(() => {
    const handler = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // ── Playback state ──────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [looping, setLooping] = useState(false);
  const animRef = useRef(null);
  const [animStep, setAnimStep] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);

  // ── Load board ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    getTactic(id)
      .then((res) => {
        const b = res.data;
        const loadedSport = b.sport || "football";
        setSport(loadedSport);
        setTitle(b.title || "");
        setFieldType(b.fieldType || "full");
        setSteps(b.steps?.length ? b.steps : [createInitialStep(getDefaultFormation(loadedSport), getDefaultFormation(loadedSport), loadedSport)]);
        setHomeFormation(b.homeTeam?.formation || getDefaultFormation(loadedSport));
        setAwayFormation(b.awayTeam?.formation || getDefaultFormation(loadedSport));
        setHomeColor(b.homeTeam?.color || "#2563eb");
        setAwayColor(b.awayTeam?.color || "#ef4444");
        setDrillId(b.drill?._id || b.drill || null);
        setDrillTitle(b.drill?.title || "");
        setIsOwner(!!b.isOwner);
        if (!b.isOwner) setCoachMode(true); // Non-owners open in coach mode
        setLoading(false);
      })
      .catch(() => navigate("/tactics"));
  }, [id, navigate]);

  const PITCH = useMemo(() => getPitch(sport), [sport]);
  const sportFormations = useMemo(() => getFormations(sport), [sport]);
  const sportFieldViews = useMemo(() => SPORT_CONFIGS[sport]?.fieldViews || SPORT_CONFIGS.football.fieldViews, [sport]);

  // Auto-rotate: in fullscreen, rotate canvas if pitch is landscape and viewport is portrait
  const [shouldRotate, setShouldRotate] = useState(false);
  useEffect(() => {
    if (!isFullscreen) { setShouldRotate(false); return; }
    const check = () => {
      const cfg = sportFieldViews[fieldType] || Object.values(sportFieldViews)[0];
      const pitchIsLandscape = cfg.w > cfg.h;
      const screenIsPortrait = window.innerHeight > window.innerWidth;
      setShouldRotate(pitchIsLandscape && screenIsPortrait);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [isFullscreen, sportFieldViews, fieldType]);
  const currentStep = steps[currentStepIdx];

  // ── Piece counts ────────────────────────────────────────────────────────
  const homePlayers = currentStep?.pieces.filter((p) => p.team === "home" && p.type === "player") || [];
  const awayPlayers = currentStep?.pieces.filter((p) => p.team === "away" && p.type === "player") || [];
  const hasBall = currentStep?.pieces.some((p) => p.type === "ball");
  const selectedPiece = currentStep?.pieces.find((p) => p.id === selectedPieceId);

  // ── Piece mutation ──────────────────────────────────────────────────────
  const handlePieceMove = useCallback((pieceId, x, y) => {
    setDirty(true);
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = step.pieces.map((p) => p.id === pieceId ? { ...p, x, y } : p);
      next[currentStepIdx] = step;
      return next;
    });
  }, [currentStepIdx]);

  // ── Arrow ops ───────────────────────────────────────────────────────────
  const handleArrowCreate = useCallback((arrow) => {
    setDirty(true);
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.arrows = [...step.arrows, arrow];
      next[currentStepIdx] = step;
      return next;
    });
  }, [currentStepIdx]);

  const handleArrowDelete = useCallback((arrowId) => {
    setDirty(true);
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.arrows = step.arrows.filter((a) => a.id !== arrowId);
      next[currentStepIdx] = step;
      return next;
    });
  }, [currentStepIdx]);

  // ── Step management ─────────────────────────────────────────────────────
  const addStep = () => {
    setDirty(true);
    const last = steps[steps.length - 1];
    const newStep = {
      id: `step-${Date.now()}`, label: `Step ${steps.length + 1}`, duration: 1500,
      pieces: last.pieces.map((p) => ({ ...p })), arrows: [],
    };
    setSteps((prev) => [...prev, newStep]);
    setCurrentStepIdx(steps.length);
  };

  const deleteStep = (idx) => {
    if (steps.length <= 1) return;
    setDirty(true);
    setSteps((prev) => prev.filter((_, i) => i !== idx));
    setCurrentStepIdx((prev) => Math.min(prev, steps.length - 2));
  };

  const setStepDuration = (idx, dur) => {
    setSteps((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], duration: dur };
      return next;
    });
  };

  // ── Formation changes ───────────────────────────────────────────────────
  const applyFormation = (team, formation) => {
    if (team === "home") setHomeFormation(formation);
    else setAwayFormation(formation);
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      const otherPieces = step.pieces.filter((p) => p.team !== team);
      step.pieces = [...otherPieces, ...buildFormationPieces(team, formation, sport)];
      next[currentStepIdx] = step;
      return next;
    });
  };

  // ── Sport change ───────────────────────────────────────────────────────
  const handleSportChange = (newSport) => {
    if (newSport === sport) return;
    const hasPieces = currentStep?.pieces.length > 0 || steps.length > 1;
    if (hasPieces && !window.confirm(t("tactics.confirmSportChange"))) return;
    setSport(newSport);
    const defaultF = getDefaultFormation(newSport);
    setHomeFormation(defaultF);
    setAwayFormation(defaultF);
    const sportViews = SPORT_CONFIGS[newSport]?.fieldViews || {};
    const newFieldType = sportViews[fieldType] ? fieldType : "full";
    setFieldType(newFieldType);
    setSteps([createInitialStep(defaultF, defaultF, newSport)]);
    setCurrentStepIdx(0);
    setSelectedPieceId(null);
  };

  // ── Add / remove pieces ─────────────────────────────────────────────────
  const addPiece = (team) => {
    const existing = currentStep.pieces.filter((p) => p.team === team && p.type === "player");
    const newPiece = {
      id: `${team}-extra-${Date.now()}`, type: "player", team, isGK: false,
      label: String(existing.length + 1),
      x: PITCH.width / 2 + (team === "home" ? -10 : 10),
      y: PITCH.height / 2,
    };
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = [...step.pieces, newPiece];
      next[currentStepIdx] = step;
      return next;
    });
  };

  const removePieceFromTeam = (team) => {
    const players = currentStep.pieces.filter((p) => p.team === team && p.type === "player");
    if (players.length <= 1) return;
    const last = players[players.length - 1];
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = step.pieces.filter((p) => p.id !== last.id);
      next[currentStepIdx] = step;
      return next;
    });
    if (selectedPieceId === last.id) setSelectedPieceId(null);
  };

  const addBall = () => {
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = [...step.pieces, { id: `ball-${Date.now()}`, type: "ball", team: "neutral", label: "", x: PITCH.width / 2, y: PITCH.height / 2 }];
      next[currentStepIdx] = step;
      return next;
    });
  };

  const addCone = () => {
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = [...step.pieces, { id: `cone-${Date.now()}`, type: "cone", team: "neutral", label: "", x: PITCH.width / 2, y: PITCH.height / 2 - 5 }];
      next[currentStepIdx] = step;
      return next;
    });
  };

  const deleteSelectedPiece = useCallback(() => {
    if (!selectedPieceId) return;
    setSteps((prev) => {
      const next = [...prev];
      const step = { ...next[currentStepIdx] };
      step.pieces = step.pieces.filter((p) => p.id !== selectedPieceId);
      next[currentStepIdx] = step;
      return next;
    });
    setSelectedPieceId(null);
  }, [selectedPieceId, currentStepIdx]);

  const handlePieceLabel = useCallback((pieceId, label) => {
    setDirty(true);
    // Update the label across ALL steps so the name stays consistent in animations
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        pieces: step.pieces.map((p) => p.id === pieceId ? { ...p, label } : p),
      }))
    );
  }, []);

  // ── Playback engine ─────────────────────────────────────────────────────
  const playStartIdx = useRef(0);
  useEffect(() => {
    if (!isPlaying || steps.length < 2) {
      if (isPlaying) setIsPlaying(false);
      return;
    }
    let stepIdx = playStartIdx.current;
    let startTime = null;
    setAnimStep(stepIdx);
    setAnimProgress(0);

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) * playbackSpeed;
      const duration = steps[stepIdx]?.duration || 1500;
      const t = Math.min(elapsed / duration, 1);
      setAnimStep(stepIdx);
      setAnimProgress(easeInOutQuad(t));
      if (t >= 1) {
        if (stepIdx < steps.length - 2) {
          stepIdx++;
          setCurrentStepIdx(stepIdx);
          startTime = null;
        } else if (looping) {
          stepIdx = 0;
          setCurrentStepIdx(0);
          startTime = null;
        } else {
          setIsPlaying(false);
          setCurrentStepIdx(steps.length - 1);
          return;
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, playbackSpeed, steps, looping]);

  const displayedPieces = useMemo(() => {
    if (!isPlaying || steps.length < 2) return currentStep?.pieces || [];
    const fromIdx = animStep;
    const toIdx = Math.min(animStep + 1, steps.length - 1);
    if (fromIdx === toIdx) return steps[toIdx].pieces;
    const from = steps[fromIdx].pieces;
    const to = steps[toIdx].pieces;
    return from.map((piece) => {
      const target = to.find((p) => p.id === piece.id);
      if (!target) return piece;
      return { ...piece, x: piece.x + (target.x - piece.x) * animProgress, y: piece.y + (target.y - piece.y) * animProgress };
    });
  }, [isPlaying, steps, currentStep, animStep, animProgress]);

  const ghostPieces = useMemo(() => {
    if (isPlaying || currentStepIdx === 0) return [];
    return steps[currentStepIdx - 1]?.pieces || [];
  }, [isPlaying, currentStepIdx, steps]);

  const displayedArrows = isPlaying ? steps[animStep]?.arrows || [] : currentStep?.arrows || [];

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg("");
    try {
      const data = {
        title: title || t("tactics.untitled"), sport, fieldType, steps,
        homeTeam: { formation: homeFormation, color: homeColor },
        awayTeam: { formation: awayFormation, color: awayColor },
        ...(drillId && { drill: drillId }),
      };
      if (id) {
        await updateTactic(id, data);
      } else {
        const res = await createTactic(data);
        navigate(`/tactics/${res.data._id}`, { replace: true });
      }
      setDirty(false);
      setSaveMsg(t("tactics.boardSaved"));
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg(t("common.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Field type change (confirm + clear) ────────────────────────────────
  const handleFieldTypeChange = (newType) => {
    if (newType === fieldType) return;
    const hasPieces = currentStep?.pieces.length > 0 || steps.length > 1;
    if (hasPieces && !window.confirm(t("tactics.confirmFieldChange"))) return;
    setFieldType(newType);
    setSteps([createInitialStep(homeFormation, awayFormation, sport)]);
    setCurrentStepIdx(0);
    setSelectedPieceId(null);
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelectedPiece(); }
      else if (e.key === " ") { e.preventDefault(); if (isPlaying) { setIsPlaying(false); } else { const start = currentStepIdx >= steps.length - 1 ? 0 : currentStepIdx; playStartIdx.current = start; setCurrentStepIdx(start); setIsPlaying(true); } }
      else if (e.key === "1") setTool("select");
      else if (e.key === "2") setTool("arrow");
      else if (e.key === "3") setTool("pass");
      else if (e.key === "4") setTool("dribble");
      else if (e.key === "5") setTool("dashedArrow");
      else if (e.key === "6") setTool("ballPass");
      else if (e.key === "0") setTool("eraser");
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelectedPiece, toggleFullscreen]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`tactic-page ${isFullscreen ? "tactic-fullscreen" : ""} ${shouldRotate ? "tactic-fs-rotated" : ""}`} ref={fullscreenRef}>

      {/* ── Fullscreen presentation overlay ── */}
      {isFullscreen && (
        <div className="tactic-fs-controls">
          <div className="tactic-fs-playback">
            <button className="tactic-fs-btn" disabled={steps.length < 2}
              onClick={() => { if (isPlaying) { setIsPlaying(false); } else { const start = currentStepIdx >= steps.length - 1 ? 0 : currentStepIdx; playStartIdx.current = start; setCurrentStepIdx(start); setIsPlaying(true); } }}>
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button className="tactic-fs-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}><FiSkipBack /></button>
            <button className="tactic-fs-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(steps.length - 1); }}><FiSkipForward /></button>
            <button className={`tactic-fs-btn ${looping ? "active" : ""}`} onClick={() => setLooping((l) => !l)}><FiRepeat /></button>
            {steps.length > 1 && (
              <span className="tactic-fs-step-indicator">
                {currentStepIdx + 1} / {steps.length}
              </span>
            )}
          </div>
          <div className="tactic-fs-playback">
            <button className="tactic-fs-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={zoom <= 0.5}><FiZoomOut /></button>
            <span className="tactic-fs-step-indicator">{Math.round(zoom * 100)}%</span>
            <button className="tactic-fs-btn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3}><FiZoomIn /></button>
            <button className="tactic-fs-btn tactic-fs-exit" onClick={toggleFullscreen}>
              <FiMinimize />
            </button>
          </div>
        </div>
      )}

      {/* Header — hidden in fullscreen */}
      {!isFullscreen && (
      <div className="tactic-header">
        {coachMode ? (
          <>
            {isOwner && (
              <button className="btn btn-secondary btn-sm" onClick={() => setCoachMode(false)}>
                <FiEdit3 /> <span className="tactic-hide-xs">{t("tactics.editMode")}</span>
              </button>
            )}
            {!isOwner && (
              <Link to="/tactics" className="btn btn-secondary btn-sm"><FiArrowLeft /> <span className="tactic-hide-xs">{t("tactics.title")}</span></Link>
            )}
            <span className="tactic-title-readonly">{title || t("tactics.untitled")}</span>
            {drillId && (
              <Link to={`/drills/${drillId}`} className="tactic-drill-link" title={drillTitle || t("tactics.linkedDrill")}>
                <FiTarget /> <span className="tactic-hide-xs">{drillTitle || t("tactics.linkedDrill")}</span>
              </Link>
            )}
            <div className="tactic-header-actions">
              <button className="btn btn-secondary btn-sm" onClick={toggleFullscreen} title={`${t("tactics.present")} (F)`}>
                <FiMaximize />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/tactics" className="btn btn-secondary btn-sm"><FiArrowLeft /> <span className="tactic-hide-xs">{t("tactics.title")}</span></Link>
            <input className="tactic-title-input" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder={t("tactics.untitled")} />
            {drillId && (
              <Link to={`/drills/${drillId}`} className="tactic-drill-link" title={drillTitle || t("tactics.linkedDrill")}>
                <FiTarget /> <span className="tactic-hide-xs">{drillTitle || t("tactics.linkedDrill")}</span>
              </Link>
            )}
            <div className="tactic-header-actions">
              {saveMsg && <span className="text-sm text-muted">{saveMsg}</span>}
              <button className="btn btn-secondary btn-sm" onClick={() => setCoachMode(true)} title={t("tactics.coachMode")}>
                <FiEye /> <span className="tactic-hide-xs">{t("tactics.coachMode")}</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={toggleFullscreen} title={`${t("tactics.present")} (F)`}>
                <FiMaximize />
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving}>
                <FiSave /> {isSaving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </>
        )}
      </div>
      )}

      {/* Toolbar — both rows */}
      <TacticToolbar
        tool={tool} onToolChange={setTool}
        coachMode={coachMode} isFullscreen={isFullscreen}
        homePlayers={homePlayers} awayPlayers={awayPlayers}
        homeColor={homeColor} awayColor={awayColor} hasBall={hasBall}
        zoom={zoom}
        sport={sport} fieldType={fieldType}
        homeFormation={homeFormation} awayFormation={awayFormation}
        sportFormations={sportFormations} sportFieldViews={sportFieldViews}
        onAddPiece={addPiece} onRemovePiece={removePieceFromTeam}
        onAddBall={addBall} onAddCone={addCone}
        onZoomChange={setZoom} onSportChange={handleSportChange}
        onFieldTypeChange={handleFieldTypeChange}
        onFormationChange={applyFormation}
        onColorChange={(team, color) => team === "home" ? setHomeColor(color) : setAwayColor(color)}
      />

      {/* Selected piece bar (edit mode only) */}
      {selectedPiece && !isPlaying && !isFullscreen && !coachMode && (
        <div className="tactic-selection-bar">
          <span>
            {selectedPiece.type === "ball" ? t("tactics.ball") : selectedPiece.type === "cone" ? t("tactics.cone") : t("tactics.player")}
            {selectedPiece.team !== "neutral" && (
              <span className="tactic-color-dot" style={{ background: selectedPiece.team === "home" ? homeColor : awayColor, marginLeft: 6 }} />
            )}
          </span>
          {selectedPiece.type === "player" && (
            <input
              className="tactic-label-input"
              value={selectedPiece.label}
              onChange={(e) => handlePieceLabel(selectedPiece.id, e.target.value)}
              placeholder={t("tactics.labelPlaceholder")}
              maxLength={5}
            />
          )}
          <button className="btn btn-danger btn-sm" onClick={deleteSelectedPiece}>
            <FiTrash2 /> {t("tactics.removePiece")}
          </button>
        </div>
      )}

      {/* Canvas */}
      <TacticCanvas
        pieces={displayedPieces} arrows={displayedArrows} ghostPieces={ghostPieces}
        tool={isFullscreen ? "select" : DRAW_TOOLS.includes(tool) ? tool : tool === "ballPass" ? "pass" : tool}
        isPlaying={isPlaying}
        sport={sport}
        onPieceMove={handlePieceMove} onArrowCreate={(arrow) => {
          // Override style for ballPass tool
          if (tool === "ballPass") arrow.style = "ballPass";
          handleArrowCreate(arrow);
        }}
        onArrowDelete={handleArrowDelete}
        selectedPieceId={selectedPieceId} onPieceSelect={setSelectedPieceId}
        homeColor={homeColor} awayColor={awayColor} fieldType={fieldType}
        zoom={zoom}
        isRotated={shouldRotate}
      />

      {/* Timeline — hidden in fullscreen */}
      {!isFullscreen && <div className="tactic-timeline">
        <div className="tactic-playback-controls">
          <button className="tactic-play-btn" disabled={steps.length < 2}
            title={isPlaying ? t("tactics.timeline.pause") : t("tactics.timeline.play")}
            onClick={() => { if (isPlaying) { setIsPlaying(false); } else { const start = currentStepIdx >= steps.length - 1 ? 0 : currentStepIdx; playStartIdx.current = start; setCurrentStepIdx(start); setIsPlaying(true); } }}>
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          <button className="tactic-play-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }} title={t("tactics.timeline.toStart")}><FiSkipBack /></button>
          <button className="tactic-play-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(steps.length - 1); }} title={t("tactics.timeline.toEnd")}><FiSkipForward /></button>
          <button className={`tactic-play-btn ${looping ? "active" : ""}`} onClick={() => setLooping((l) => !l)} title={t("tactics.timeline.loop")}><FiRepeat /></button>
          <select className="form-control form-control-sm" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} style={{ width: "auto" }}>
            <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
          </select>
        </div>

        <div className="tactic-steps">
          {steps.map((step, idx) => (
            <div key={step.id} className={`tactic-step ${idx === currentStepIdx && !isPlaying ? "active" : ""}`}>
              <button className="tactic-step-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(idx); }}>{idx + 1}</button>
              {!coachMode && steps.length > 1 && !isPlaying && (
                <button className="tactic-step-delete" onClick={() => deleteStep(idx)} title={t("common.delete")}>&times;</button>
              )}
              {!coachMode && idx < steps.length - 1 && (
                <input type="number" className="tactic-step-duration" value={step.duration / 1000}
                  onChange={(e) => setStepDuration(idx, Math.max(0.5, Number(e.target.value)) * 1000)}
                  title={t("tactics.timeline.duration")} min="0.5" max="10" step="0.5" />
              )}
            </div>
          ))}
          {!coachMode && <button className="tactic-step-add" onClick={addStep} disabled={isPlaying} title={t("tactics.timeline.addStep")}><FiPlus /></button>}
        </div>
      </div>}

      {/* Hints (edit mode only) */}
      {!isFullscreen && !coachMode && (
      <div className="tactic-hints text-sm text-muted">
        <span><kbd>Space</kbd> {t("tactics.timeline.play")}/{t("tactics.timeline.pause")}</span>
        <span><kbd>1-6</kbd> {t("tactics.tools.select")}</span>
        <span><kbd>Del</kbd> {t("tactics.removePiece")}</span>
        <span><kbd>F</kbd> {t("tactics.present")}</span>
      </div>
      )}

    </div>
  );
}
