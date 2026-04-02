import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useTranslation } from "react-i18next";
import Pitch3D, { PITCH_W, PITCH_H, SPORT_DIMS_3D } from "./Pitch3D";
import { Player3D, Cone3D, Ball3D, Arrow3D } from "./Pieces3D";
import {
  FiPlus, FiTrash2, FiCircle, FiTriangle, FiMousePointer, FiArrowRight,
  FiPlay, FiPause, FiSkipBack, FiSkipForward, FiRepeat, FiMaximize, FiMinimize,
} from "react-icons/fi";
import * as THREE from "three";
import { OrbitControls as ThreeOrbitControls } from "three/addons/controls/OrbitControls.js";
import "../../../styles/sketch3d.css";

// ── Native OrbitControls ────────────────────────────────────────────────────
function NativeOrbitControls({ controlsRef, maxPolarAngle, minDistance, maxDistance }) {
  const { camera, gl } = useThree();
  const controls = useRef();

  useEffect(() => {
    controls.current = new ThreeOrbitControls(camera, gl.domElement);
    controls.current.enableDamping = true;
    controls.current.dampingFactor = 0.1;
    controls.current.maxPolarAngle = maxPolarAngle || Math.PI / 2.1;
    controls.current.minDistance = minDistance || 15;
    controls.current.maxDistance = maxDistance || 120;
    controls.current.enablePan = true;
    controls.current.panSpeed = 1.5;
    controls.current.screenSpacePanning = false;
    controls.current.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.current.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    if (controlsRef) controlsRef.current = controls.current;
    return () => controls.current.dispose();
  }, [camera, gl, controlsRef, maxPolarAngle, minDistance, maxDistance]);

  useFrame(() => controls.current?.update());
  return null;
}

// ── Easing ──────────────────────────────────────────────────────────────────
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Empty step helper ───────────────────────────────────────────────────────
function createEmptyStep(copyPieces = []) {
  return {
    label: "",
    duration: 1500,
    pieces: copyPieces.map((p) => ({ ...p })),
    arrows: [],
  };
}

// ── Migrate legacy single-step sketch to steps format ───────────────────────
function migrateSketch(sketch) {
  if (sketch?.steps?.length > 0) return sketch.steps;
  if (sketch?.pieces?.length > 0) {
    return [{ label: "Setup", duration: 1500, pieces: sketch.pieces, arrows: sketch.arrows || [] }];
  }
  return [createEmptyStep()];
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function DrillSketchEditor({ sketch, onChange, readOnly = false, fullHeight = false, sport = "football" }) {
  const { t } = useTranslation();
  const controlsRef = useRef();

  // Steps state
  const [steps, setSteps] = useState(() => migrateSketch(sketch));
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  const [arrowStart, setArrowStart] = useState(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [animProgress, setAnimProgress] = useState(0);
  const [animStep, setAnimStep] = useState(0);
  const playStartIdx = useRef(0);
  const animRef = useRef(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef(null);

  const currentStep = steps[currentStepIdx] || steps[0];

  // Sync back to parent
  const emitChange = useCallback((newSteps) => {
    onChange?.({ steps: newSteps });
  }, [onChange]);

  const updateSteps = useCallback((newSteps) => {
    setSteps(newSteps);
    emitChange(newSteps);
  }, [emitChange]);

  // ── Piece operations ──────────────────────────────────────────────────
  const movePiece = useCallback((id, x, z) => {
    const hw = PITCH_W / 2 + 5, hh = PITCH_H / 2 + 5;
    const cx = Math.max(-hw, Math.min(hw, x));
    const cz = Math.max(-hh, Math.min(hh, z));
    const newSteps = steps.map((s, i) =>
      i === currentStepIdx ? { ...s, pieces: s.pieces.map((p) => p.id === id ? { ...p, x: cx, z: cz } : p) } : s
    );
    updateSteps(newSteps);
  }, [steps, currentStepIdx, updateSteps]);

  const addPiece = (type, team) => {
    const id = `${type}-${Date.now()}`;
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 15;
    const color = type === "player" ? (team === "home" ? "#2563eb" : "#ef4444") : undefined;
    const count = currentStep.pieces.filter((p) => p.type === type && p.team === team).length;
    const label = type === "player" ? String(count + 1) : "";
    const newSteps = steps.map((s, i) =>
      i === currentStepIdx ? { ...s, pieces: [...s.pieces, { id, type, team: team || "neutral", label, x, z, color }] } : s
    );
    updateSteps(newSteps);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const newSteps = steps.map((s, i) =>
      i === currentStepIdx ? { ...s, pieces: s.pieces.filter((p) => p.id !== selectedId), arrows: s.arrows.filter((a) => a.id !== selectedId) } : s
    );
    updateSteps(newSteps);
    setSelectedId(null);
  };

  // ── Arrow style cycling ────────────────────────────────────────────────
  const ARROW_STYLES = ["solid", "dashed", "pass", "bounce"];
  const selectedArrow = currentStep?.arrows?.find((a) => a.id === selectedId);

  const cycleArrowStyle = () => {
    if (!selectedArrow) return;
    const idx = ARROW_STYLES.indexOf(selectedArrow.style || "solid");
    const next = ARROW_STYLES[(idx + 1) % ARROW_STYLES.length];
    const newSteps = steps.map((s, i) =>
      i === currentStepIdx ? { ...s, arrows: s.arrows.map((a) => a.id === selectedId ? { ...a, style: next } : a) } : s
    );
    updateSteps(newSteps);
  };

  // ── Step operations ───────────────────────────────────────────────────
  const addStep = () => {
    const last = steps[steps.length - 1];
    const newStep = createEmptyStep(last.pieces);
    newStep.label = `Step ${steps.length + 1}`;
    const newSteps = [...steps, newStep];
    updateSteps(newSteps);
    setCurrentStepIdx(newSteps.length - 1);
  };

  const deleteStep = (idx) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== idx);
    updateSteps(newSteps);
    setCurrentStepIdx(Math.min(currentStepIdx, newSteps.length - 1));
  };

  // ── Ground click (arrow drawing) ──────────────────────────────────────
  const handleGroundClick = useCallback((e) => {
    if (readOnly && !isFullscreen) return;
    if (isFullscreen) { setSelectedId(null); return; }
    if (tool === "select") { setSelectedId(null); return; }
    if (tool === "arrow") {
      e.stopPropagation();
      const pt = e.point;
      if (!arrowStart) {
        setArrowStart({ x: pt.x, z: pt.z });
        if (controlsRef.current) controlsRef.current.enabled = false;
      } else {
        const dx = pt.x - arrowStart.x, dz = pt.z - arrowStart.z;
        if (Math.sqrt(dx * dx + dz * dz) > 1) {
          const newArrow = { id: `arrow-${Date.now()}`, fromX: arrowStart.x, fromZ: arrowStart.z, toX: pt.x, toZ: pt.z, color: "#ffffff", style: "solid" };
          const newSteps = steps.map((s, i) => i === currentStepIdx ? { ...s, arrows: [...s.arrows, newArrow] } : s);
          updateSteps(newSteps);
        }
        setArrowStart(null);
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  }, [tool, arrowStart, steps, currentStepIdx, updateSteps, readOnly, isFullscreen]);

  // ── Playback engine ───────────────────────────────────────────────────
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

  // Interpolated pieces for animation
  const displayedPieces = useMemo(() => {
    if (!isPlaying || steps.length < 2) return currentStep?.pieces || [];
    const fromIdx = animStep;
    const toIdx = Math.min(animStep + 1, steps.length - 1);
    if (fromIdx === toIdx) return steps[toIdx].pieces;
    const from = steps[fromIdx].pieces;
    const to = steps[toIdx].pieces;
    const arrows = steps[fromIdx].arrows || [];

    // Pre-compute interpolated positions for all pieces (needed for ball→player proximity)
    const interpolatedAll = from.map((piece) => {
      const target = to.find((p) => p.id === piece.id);
      if (!target) return piece;
      return { ...piece, x: piece.x + (target.x - piece.x) * animProgress, z: piece.z + (target.z - piece.z) * animProgress };
    });

    return interpolatedAll.map((interpolated) => {
      const piece = from.find((p) => p.id === interpolated.id) || interpolated;
      const target = to.find((p) => p.id === interpolated.id);

      // Ball trajectory during handball animation
      if (piece.type === "ball" && sport === "handball" && target) {
        const HAND_Y = 1.5, GROUND_Y = 0.28, HOLD_DIST = 1.5;
        const t = animProgress;

        // Check if ball is near a player at start and end frames
        const nearPlayerStart = from.filter((p) => p.type === "player").some((pl) => {
          const dx = pl.x - piece.x, dz = pl.z - piece.z;
          return Math.sqrt(dx * dx + dz * dz) < HOLD_DIST;
        });
        const nearPlayerEnd = to.filter((p) => p.type === "player").some((pl) => {
          const dx = pl.x - target.x, dz = pl.z - target.z;
          return Math.sqrt(dx * dx + dz * dz) < HOLD_DIST;
        });

        // Check for bounce arrow along this ball's path
        const hasBounce = arrows.some((a) => a.style === "bounce" &&
          Math.abs(a.fromX - piece.x) < 2 && Math.abs(a.fromZ - piece.z) < 2 &&
          Math.abs(a.toX - target.x) < 2 && Math.abs(a.toZ - target.z) < 2
        );

        const startY = nearPlayerStart ? HAND_Y : GROUND_Y;
        const endY = nearPlayerEnd ? HAND_Y : GROUND_Y;

        if (hasBounce) {
          // Bounce pass: V-curve (start → ground at midpoint → end)
          interpolated.ballY = t < 0.5
            ? startY + (GROUND_Y - startY) * (t * 2)
            : GROUND_Y + (endY - GROUND_Y) * ((t - 0.5) * 2);
        } else if (nearPlayerStart || nearPlayerEnd) {
          // Regular pass / air ball: smooth arc (slight parabolic loft)
          const baseY = startY + (endY - startY) * t;
          const arcHeight = 0.8; // extra loft at midpoint
          const arc = arcHeight * 4 * t * (1 - t); // parabola peaking at t=0.5
          interpolated.ballY = baseY + arc;
        }
        // else: ball stays on ground (no players nearby), no ballY override
      }

      return interpolated;
    });
  }, [isPlaying, steps, currentStep, animStep, animProgress, sport]);

  const displayedArrows = isPlaying ? steps[animStep]?.arrows || [] : currentStep?.arrows || [];

  const startPlay = () => {
    const start = currentStepIdx >= steps.length - 1 ? 0 : currentStepIdx;
    playStartIdx.current = start;
    setCurrentStepIdx(start);
    setIsPlaying(true);
  };

  // ── Fullscreen ────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const el = fullscreenRef.current;
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // In fullscreen, allow moving pieces but not editing tools
  const canDrag = !isPlaying && (isFullscreen || (!readOnly && tool === "select"));

  return (
    <div
      ref={fullscreenRef}
      className={`drill-sketch-editor ${isFullscreen ? "sketch-fullscreen" : ""}`}
      style={fullHeight && !isFullscreen ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}
    >
      {/* Toolbar — hidden in fullscreen */}
      {!readOnly && !isFullscreen && (
        <div className="sketch-toolbar">
          <button className={`btn btn-sm ${tool === "select" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setTool("select"); setArrowStart(null); }} title={t("sketch.select")}>
            <FiMousePointer />
          </button>
          <button className={`btn btn-sm ${tool === "arrow" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTool("arrow")} title={t("sketch.arrow")}>
            <FiArrowRight />
          </button>
          <span className="sketch-toolbar-divider" />
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("player", "home")} style={{ borderLeft: "3px solid #2563eb" }}>
            <FiPlus /> {t("sketch.home")}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("player", "away")} style={{ borderLeft: "3px solid #ef4444" }}>
            <FiPlus /> {t("sketch.away")}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("ball", "neutral")}><FiCircle /></button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("cone", "neutral")}><FiTriangle /></button>
          {selectedId && (
            <>
              <span className="sketch-toolbar-divider" />
              {selectedArrow && (
                <button className="btn btn-sm btn-secondary" onClick={cycleArrowStyle} title={t("sketch.cycleStyle")}>
                  {selectedArrow.style || "solid"}
                </button>
              )}
              <button className="btn btn-sm btn-danger" onClick={deleteSelected}><FiTrash2 /> {t("common.delete")}</button>
            </>
          )}
          <span className="sketch-toolbar-divider" />
          <button className="btn btn-sm btn-secondary" onClick={toggleFullscreen} title={t("sketch.fullscreen")}><FiMaximize /></button>
        </div>
      )}

      {/* Fullscreen controls overlay */}
      {isFullscreen && (
        <div className="sketch-fs-controls">
          <div className="flex gap-sm" style={{ alignItems: "center" }}>
            <button className="btn btn-sm" onClick={() => isPlaying ? setIsPlaying(false) : startPlay()} disabled={steps.length < 2}>
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button className="btn btn-sm" onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}><FiSkipBack /></button>
            <button className="btn btn-sm" onClick={() => { setIsPlaying(false); setCurrentStepIdx(steps.length - 1); }}><FiSkipForward /></button>
            <button className={`btn btn-sm ${looping ? "btn-primary" : ""}`} onClick={() => setLooping((l) => !l)}><FiRepeat /></button>
            <select className="form-control form-control-sm" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} style={{ width: 55 }}>
              <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
            </select>
            {steps.length > 1 && <span className="text-sm" style={{ color: "#ccc" }}>{currentStepIdx + 1}/{steps.length}</span>}
          </div>
          <button className="btn btn-sm" onClick={toggleFullscreen}><FiMinimize /></button>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="sketch-canvas-wrapper" style={fullHeight || isFullscreen ? { height: "100%", flex: 1 } : undefined}>
        <Canvas shadows camera={{ position: [0, 60, 50], fov: 45 }} onPointerMissed={() => setSelectedId(null)}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[30, 50, 20]} intensity={1} castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024}
            shadow-camera-far={150} shadow-camera-left={-60} shadow-camera-right={60}
            shadow-camera-top={40} shadow-camera-bottom={-40} />

          <Pitch3D sport={sport} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={false} onClick={handleGroundClick} name="groundPlane">
            <planeGeometry args={[(SPORT_DIMS_3D[sport]?.w || PITCH_W) + 20, (SPORT_DIMS_3D[sport]?.h || PITCH_H) + 20]} />
            <meshBasicMaterial />
          </mesh>

          {displayedArrows.map((a) => (
            <Arrow3D key={a.id} arrow={a} isSelected={selectedId === a.id} onSelect={() => setSelectedId(a.id)} />
          ))}

          {displayedPieces.map((p) => {
            const props = {
              key: p.id, piece: p,
              onMove: (x, z) => movePiece(p.id, x, z),
              isSelected: selectedId === p.id,
              onSelect: () => setSelectedId(p.id),
              enabled: canDrag,
              onDragStart: () => { if (controlsRef.current) controlsRef.current.enabled = false; },
              onDragEnd: () => { if (controlsRef.current) controlsRef.current.enabled = true; },
            };
            if (p.type === "cone") return <Cone3D {...props} />;
            if (p.type === "ball") return <Ball3D {...props} sport={sport} allPieces={displayedPieces} />;
            return <Player3D {...props} sport={sport} />;
          })}

          <NativeOrbitControls controlsRef={controlsRef} maxPolarAngle={Math.PI / 2.1} minDistance={15} maxDistance={120} />
          <color attach="background" args={["#87ceeb"]} />
          <fog attach="fog" args={["#87ceeb", 100, 200]} />
        </Canvas>
      </div>

      {/* Step timeline — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="sketch-timeline">
          <div className="flex gap-sm" style={{ alignItems: "center" }}>
            <button className="btn btn-sm" onClick={() => isPlaying ? setIsPlaying(false) : startPlay()} disabled={steps.length < 2}>
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button className="btn btn-sm" onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}><FiSkipBack /></button>
            <button className="btn btn-sm" onClick={() => { setIsPlaying(false); setCurrentStepIdx(steps.length - 1); }}><FiSkipForward /></button>
            <button className={`btn btn-sm ${looping ? "btn-primary" : ""}`} onClick={() => setLooping((l) => !l)}><FiRepeat /></button>
            <select className="form-control form-control-sm" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} style={{ width: 55 }}>
              <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
            </select>
          </div>
          <div className="sketch-steps">
            {steps.map((step, idx) => (
              <div key={idx} className={`sketch-step ${idx === currentStepIdx && !isPlaying ? "active" : ""}`}>
                <button className="sketch-step-btn" onClick={() => { setIsPlaying(false); setCurrentStepIdx(idx); }}>
                  {idx + 1}
                </button>
                {!readOnly && steps.length > 1 && !isPlaying && (
                  <button className="sketch-step-delete" onClick={() => deleteStep(idx)}>&times;</button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button className="sketch-step-add" onClick={addStep} disabled={isPlaying}><FiPlus /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
