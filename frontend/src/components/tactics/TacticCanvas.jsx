import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Group, RegularPolygon } from "react-konva";
import { SPORT_CONFIGS, DRAW_TOOLS, getPitch } from "./sportConfigs";

// Re-export for consumers that import from TacticCanvas
export { FORMATIONS, DRAW_TOOLS, createInitialStep, buildFormationPieces, SPORT_CONFIGS, SPORT_FORMATIONS, SPORT_GROUPS, getSportGroup, getFormations, getDefaultFormation, getPitch } from "./sportConfigs";

// Helper to get field configs for a sport
export function getFieldConfigs(sport = "football") {
  return SPORT_CONFIGS[sport]?.fieldViews || SPORT_CONFIGS.football.fieldViews;
}

// Legacy compat
const PITCH = { width: 105, height: 68 };

// Field configs for partial views (in meters) — default football
const FIELD_CONFIGS = SPORT_CONFIGS.football.fieldViews;

function createScale(canvasW, canvasH, fieldType = "full", padding = 30, zoom = 1, panX = 0, panY = 0, fieldConfigs = FIELD_CONFIGS) {
  const cfg = fieldConfigs[fieldType] || Object.values(fieldConfigs)[0];
  const baseScaleX = (canvasW - 2 * padding) / cfg.w;
  const baseScaleY = (canvasH - 2 * padding) / cfg.h;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  // Zoom out (< 1): field stays full size, only elements shrink
  // Zoom in (> 1): field grows beyond canvas (pan to navigate)
  const fieldZoom = zoom <= 1 ? 1 : zoom;
  const scale = baseScale * fieldZoom;

  const fieldW = cfg.w * scale;
  const fieldH = cfg.h * scale;

  const offsetX = (canvasW - fieldW) / 2 + panX;
  const offsetY = (canvasH - fieldH) / 2 + panY;

  // Element scale:
  // Zoom out: elements shrink with zoom (more space on field)
  // Zoom in: elements grow slowly (capped at 1.3x) so they don't become huge
  const elemZoom = zoom <= 1 ? zoom : 1 + (zoom - 1) * 0.3;
  const elemScale = baseScale * Math.min(elemZoom, 1.3);

  return {
    x: (m) => offsetX + (m - cfg.x) * scale,
    y: (m) => offsetY + m * scale,
    s: (m) => m * scale,
    es: (m) => m * elemScale,
    inv: (px, py) => [(px - offsetX) / scale + cfg.x, (py - offsetY) / scale],
    fieldX: offsetX,
    fieldY: offsetY,
    fieldW,
    fieldH,
    canvasW,
    canvasH,
    cfg,
    scale,
    zoom,
  };
}

// ── Arc helper ──────────────────────────────────────────────────────────────
function arcPoints(cx, cy, r, startDeg, endDeg, n = 30) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((startDeg + (endDeg - startDeg) * (i / n)) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return pts;
}

// ── Wavy line points (for dribble) ──────────────────────────────────────────
function wavyLinePoints(x1, y1, x2, y2, amplitude = 6, waves = 6) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return [x1, y1, x2, y2];
  const nx = -dy / dist;
  const ny = dx / dist;
  const pts = [];
  const steps = Math.max(waves * 8, 24);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseX = x1 + dx * t;
    const baseY = y1 + dy * t;
    const wave = Math.sin(t * waves * Math.PI * 2) * amplitude;
    pts.push(baseX + nx * wave, baseY + ny * wave);
  }
  return pts;
}

import SportField from "./FieldRenderers";

// ── Player / Ball / Cone Piece ──────────────────────────────────────────────
function PlayerPiece({ piece, x, y, sc, draggable, isGhost, isSelected, homeColor, awayColor, onDragEnd, onSelect, pitchBounds, isRotated, stageHeight, sport }) {
  // Scale player radius relative to field size (1.8m on 105m = ~1.7% — keep that ratio)
  const fieldDiag = Math.sqrt(sc.cfg.w * sc.cfg.w + sc.cfg.h * sc.cfg.h);
  const baseRadius = Math.max(0.8, Math.min(1.8, fieldDiag * 0.014));
  const radius = sc.es(baseRadius);
  const px = sc.x(x);
  const py = sc.y(y);
  const bounds = pitchBounds || { width: 105, height: 68 };
  const lastPointer = useRef(null);

  const getColor = () => {
    if (piece.type === "ball") return (sport === "padel" || sport?.startsWith("tennis")) ? "#e8d44d" : "#ffffff";
    if (piece.type === "cone") return "#ff8c00";
    if (piece.isGK) return piece.team === "home" ? "#eab308" : "#f97316";
    return piece.team === "home" ? (homeColor || "#2563eb") : (awayColor || "#ef4444");
  };

  const isBall = piece.type === "ball";
  const isCone = piece.type === "cone";
  const r = isBall ? radius * ((sport === "padel" || sport?.startsWith("tennis")) ? 0.25 : 0.65) : isCone ? radius * 0.55 : radius;

  return (
    <Group
      x={px} y={py}
      draggable={draggable && !isGhost}
      opacity={isGhost ? 0.3 : 1}
      onDragStart={() => {
        if (isRotated) {
          // Store starting position for corrected drag calculation
          lastPointer.current = { nodeX: px, nodeY: py };
        }
      }}
      onDragMove={(e) => {
        if (!isRotated) return;
        // Konva applies wrong deltas due to CSS rotation. Undo Konva's move
        // and apply corrected delta based on raw pointer position.
        const pos = e.target.getStage().getPointerPosition();
        if (!pos || !lastPointer.current) return;
        // Un-rotate pointer: CSS rotate(90deg) CW → canvas (posY, stageH - posX)
        const correctedX = pos.y;
        const correctedY = stageHeight - pos.x;
        // On first move, capture the corrected start position
        if (lastPointer.current.correctedStartX == null) {
          lastPointer.current.correctedStartX = correctedX;
          lastPointer.current.correctedStartY = correctedY;
        }
        // Set position based on total corrected delta from drag start
        const dx = correctedX - lastPointer.current.correctedStartX;
        const dy = correctedY - lastPointer.current.correctedStartY;
        e.target.x(lastPointer.current.nodeX + dx);
        e.target.y(lastPointer.current.nodeY + dy);
      }}
      onDragEnd={(e) => {
        const nodeX = e.target.x();
        const nodeY = e.target.y();
        const [mx, my] = sc.inv(nodeX, nodeY);
        onDragEnd?.(piece.id, Math.max(-3, Math.min(bounds.width + 3, mx)), Math.max(-3, Math.min(bounds.height + 3, my)));
      }}
      onClick={() => onSelect?.(piece.id)}
      onTap={() => onSelect?.(piece.id)}
      onMouseEnter={(e) => { if (draggable && !isGhost) e.target.getStage().container().style.cursor = "grab"; }}
      onMouseLeave={(e) => { e.target.getStage().container().style.cursor = "default"; }}
    >
      {isSelected && !isGhost && <Circle radius={r + 5} stroke="#fbbf24" strokeWidth={3} />}
      {!isGhost && !isCone && <Circle radius={r} fill="rgba(0,0,0,0.25)" offsetX={-1.5} offsetY={-1.5} />}
      {isCone ? (
        <RegularPolygon sides={3} radius={r} fill={getColor()} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
      ) : (
        <Circle radius={r} fill={getColor()} stroke={isBall ? "#333" : "rgba(255,255,255,0.9)"} strokeWidth={isBall ? 1.5 : 2} />
      )}
      {piece.label && (
        <Text
          text={piece.label}
          fontSize={isBall ? radius * 0.6 : radius * 0.85}
          fill={isBall ? "#333" : "#fff"}
          fontStyle="bold" align="center" verticalAlign="middle"
          width={radius * 2} height={radius * 2} offsetX={radius} offsetY={radius}
        />
      )}
    </Group>
  );
}

// ── Render a single arrow/line based on style ───────────────────────────────
function TacticArrow({ arrow, sc, tool, onDelete, sport }) {
  const x1 = sc.x(arrow.fromX), y1 = sc.y(arrow.fromY);
  const x2 = sc.x(arrow.toX), y2 = sc.y(arrow.toY);
  const color = arrow.color || "#ffffff";
  const handleClick = () => { if (tool === "eraser") onDelete?.(arrow.id); };
  const fieldDiag = Math.sqrt(sc.cfg.w * sc.cfg.w + sc.cfg.h * sc.cfg.h);
  const arrowScale = fieldDiag / 125; // normalize to football's ~125m diagonal
  const sw = sc.es(0.4 * arrowScale);
  const pl = sc.es(1.3 * arrowScale);
  const pw = sc.es(1.3 * arrowScale);

  if (arrow.style === "dribble") {
    const isRacket = sport === "padel" || sport?.startsWith("tennis");
    if (isRacket) {
      return (
        <Arrow points={[x1, y1, x2, y2]} stroke={color} strokeWidth={sw}
          pointerLength={pl} pointerWidth={pw}
          hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
      );
    }
    const pts = wavyLinePoints(x1, y1, x2, y2, 6, 5);
    return (
      <Group>
        <Line points={pts} stroke={color} strokeWidth={sw} hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
        <Arrow points={[x1 + (x2 - x1) * 0.85, y1 + (y2 - y1) * 0.85, x2, y2]}
          stroke={color} strokeWidth={sw} pointerLength={pl} pointerWidth={pw}
          hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
      </Group>
    );
  }

  if (arrow.style === "pass") {
    const isRacket = sport === "padel" || sport?.startsWith("tennis");
    if (isRacket) {
      // Arched lob line for racket sports
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const archHeight = len * 0.45;
      // Perpendicular offset for the arch control point
      const nx = -dy / len, ny = dx / len;
      const cx_ = mx + nx * archHeight, cy_ = my + ny * archHeight;
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const t_ = i / 20;
        pts.push(
          (1 - t_) * (1 - t_) * x1 + 2 * (1 - t_) * t_ * cx_ + t_ * t_ * x2,
          (1 - t_) * (1 - t_) * y1 + 2 * (1 - t_) * t_ * cy_ + t_ * t_ * y2,
        );
      }
      return (
        <Group>
          <Line points={pts} stroke={color} strokeWidth={sw * 0.7} dash={[3, 5]}
            hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
          <Arrow points={[pts[pts.length - 4], pts[pts.length - 3], x2, y2]}
            stroke={color} strokeWidth={sw * 0.7}
            pointerLength={pl * 0.8} pointerWidth={pw * 0.8}
            hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
        </Group>
      );
    }
    return (
      <Arrow points={[x1, y1, x2, y2]} stroke={color} strokeWidth={sw * 0.7}
        pointerLength={pl * 0.8} pointerWidth={pw * 0.8} dash={[3, 5]}
        hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
    );
  }

  if (arrow.style === "ballPass") {
    return (
      <Arrow points={[x1, y1, x2, y2]} stroke="#fbbf24" fill="#fbbf24" strokeWidth={sw}
        pointerLength={pl} pointerWidth={pw} dash={[6, 4]}
        hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
    );
  }

  // solid or dashed
  return (
    <Arrow points={[x1, y1, x2, y2]} stroke={color} strokeWidth={sw}
      pointerLength={pl} pointerWidth={pw}
      dash={arrow.style === "dashed" ? [8, 6] : undefined}
      hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
  );
}

// ── Main Canvas Component ───────────────────────────────────────────────────
export default function TacticCanvas({
  pieces, arrows, ghostPieces, tool, isPlaying,
  onPieceMove, onArrowCreate, onArrowDelete,
  selectedPieceId, onPieceSelect,
  homeColor, awayColor, fieldType, zoom = 1,
  sport = "football",
  isRotated = false,
}) {
  const sportCfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;
  const sportPitch = { width: sportCfg.width, height: sportCfg.height };
  const sportFieldConfigs = sportCfg.fieldViews;
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panState = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height: containerH } = entries[0].contentRect;
      const cfg = sportFieldConfigs[fieldType] || Object.values(sportFieldConfigs)[0];
      // Use the actual container height (flex: 1 fills remaining space)
      // Fall back to aspect ratio if container height isn't available yet
      const aspectH = width * (cfg.h / cfg.w);
      const h = containerH > 100 ? Math.min(aspectH, containerH) : aspectH;
      setDims({ width, height: h });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [fieldType, sportFieldConfigs]);

  const stageW = dims.width;
  const stageH = dims.height;

  // Reset pan when zoom changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  const sc = createScale(stageW, stageH, fieldType, 30, zoom, panOffset.x, panOffset.y, sportFieldConfigs);

  const isDrawTool = DRAW_TOOLS.includes(tool);
  const canPan = zoom > 1;

  // Compute pan limits independently of sc (avoids circular deps)
  const panLimits = (() => {
    const cfg = sportFieldConfigs[fieldType] || Object.values(sportFieldConfigs)[0];
    const bs = Math.min((stageW - 60) / cfg.w, (stageH - 60) / cfg.h);
    const fw = cfg.w * bs * zoom;
    const fh = cfg.h * bs * zoom;
    return { x: Math.abs(fw - stageW) / 2, y: Math.abs(fh - stageH) / 2 };
  })();

  // Get corrected pointer position accounting for CSS rotation
  const getCorrectedPointer = useCallback((stage) => {
    const pos = stage.getPointerPosition();
    if (!isRotated || !pos) return pos;
    // CSS rotate(90deg) CW: Konva reports pointer in the rotated visual space.
    // After rotation, bounding rect ≈ (stageH × stageW) swapped.
    // Visual (sx, sy) → Canvas (sy, stageH - sx)
    return { x: pos.y, y: stageH - pos.x };
  }, [isRotated, stageH]);

  // Convert pointer position to field meters
  const pointerToField = useCallback((e) => {
    const stage = e.target.getStage();
    const pos = getCorrectedPointer(stage);
    return sc.inv(pos.x, pos.y);
  }, [sc, getCorrectedPointer]);

  // ── Pan helper (shared by Stage events and window events) ──────────
  const applyPan = useCallback((clientX, clientY) => {
    if (!panState.current) return;
    const rawDx = clientX - panState.current.startX;
    const rawDy = clientY - panState.current.startY;
    // When CSS-rotated 90deg CW: screen right = canvas down, screen down = canvas left
    const dx = isRotated ? -rawDy : rawDx;
    const dy = isRotated ? rawDx : rawDy;
    setPanOffset({
      x: Math.max(-panLimits.x, Math.min(panLimits.x, panState.current.origX + dx)),
      y: Math.max(-panLimits.y, Math.min(panLimits.y, panState.current.origY + dy)),
    });
  }, [panLimits, isRotated]);

  const endPan = useCallback(() => {
    if (!panState.current) return;
    panState.current = null;
    if (containerRef.current) containerRef.current.style.cursor = canPan ? "grab" : "";
  }, [canPan]);

  // ── Stage mouse handlers (drawing + pan) ──────────────────────────────
  const handleStageMouseDown = useCallback((e) => {
    const isTouch = e.evt.type?.startsWith("touch");
    const btn = isTouch ? 0 : e.evt.button;
    const clientX = isTouch ? e.evt.touches[0]?.clientX : e.evt.clientX;
    const clientY = isTouch ? e.evt.touches[0]?.clientY : e.evt.clientY;

    // Two-finger touch = pan (always available on touch devices)
    if (isTouch && e.evt.touches.length >= 2) {
      e.evt.preventDefault();
      const mid = {
        x: (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2,
        y: (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2,
      };
      panState.current = { startX: mid.x, startY: mid.y, origX: panOffset.x, origY: panOffset.y, isTouch: true };
      return;
    }

    // Pan: right-click or middle-click anywhere when zoom != 1
    // Also: left-click on empty background (not on a piece) when not drawing
    if (canPan) {
      const isRightOrMiddle = btn === 1 || btn === 2;
      const isBackground = e.target === e.target.getStage();
      const isBgLeft = btn === 0 && isBackground && !isDrawTool;
      if (isRightOrMiddle || isBgLeft) {
        e.evt.preventDefault();
        panState.current = { startX: clientX, startY: clientY, origX: panOffset.x, origY: panOffset.y };
        containerRef.current.style.cursor = "grabbing";
        return;
      }
    }

    // Drawing arrows (left-click only) — start draw even if clicking on existing elements
    if (!isDrawTool || btn !== 0) return;
    e.evt.preventDefault();
    const [mx, my] = pointerToField(e);
    setDrawingArrow({ fromX: mx, fromY: my, toX: mx, toY: my });
  }, [isDrawTool, pointerToField, canPan, panOffset]);

  const handleStageMouseMove = useCallback((e) => {
    // Pan movement (handled in Stage events for responsiveness)
    if (panState.current) {
      const isTouch = e.evt.type?.startsWith("touch");
      let cx, cy;
      if (isTouch && panState.current.isTouch && e.evt.touches.length >= 2) {
        cx = (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2;
        cy = (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2;
      } else if (isTouch) {
        cx = e.evt.touches[0]?.clientX;
        cy = e.evt.touches[0]?.clientY;
      } else {
        cx = e.evt.clientX;
        cy = e.evt.clientY;
      }
      applyPan(cx, cy);
      return;
    }
    // Arrow drawing
    if (!drawingArrow) return;
    const [mx, my] = pointerToField(e);
    setDrawingArrow((prev) => ({ ...prev, toX: mx, toY: my }));
  }, [drawingArrow, pointerToField, applyPan]);

  const handleStageMouseUp = useCallback(() => {
    // End pan if active
    if (panState.current) {
      endPan();
      return;
    }
    // End arrow drawing
    if (!drawingArrow) return;
    const dx = drawingArrow.toX - drawingArrow.fromX;
    const dy = drawingArrow.toY - drawingArrow.fromY;
    const fieldDiag = Math.sqrt(sc.cfg.w * sc.cfg.w + sc.cfg.h * sc.cfg.h);
    const minDist = Math.max(0.3, fieldDiag * 0.015);
    if (Math.sqrt(dx * dx + dy * dy) > minDist) {
      const styleMap = { arrow: "solid", dashedArrow: "dashed", pass: "pass", dribble: "dribble", ballPass: "ballPass" };
      onArrowCreate?.({
        id: `arrow-${Date.now()}`,
        ...drawingArrow,
        color: "#ffffff",
        style: styleMap[tool] || "solid",
      });
    }
    setDrawingArrow(null);
  }, [drawingArrow, tool, onArrowCreate, endPan]);

  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) onPieceSelect?.(null);
  }, [onPieceSelect]);

  // ── Window-level fallback (catches mouse when it leaves canvas) ───────
  useEffect(() => {
    if (!canPan) return;
    const onMove = (e) => applyPan(e.clientX, e.clientY);
    const onUp = () => endPan();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [canPan, applyPan, endPan]);

  // Preview style for the arrow currently being drawn
  const previewStyle = tool === "dribble" ? "dribble" : tool === "pass" ? "pass" : tool === "ballPass" ? "ballPass" : tool === "dashedArrow" ? "dashed" : "solid";

  return (
    <div
      ref={containerRef}
      className={`tactic-canvas-container${canPan ? " tactic-pannable" : ""}`}
      onContextMenu={canPan ? (e) => e.preventDefault() : undefined}
    >
      <Stage
        ref={stageRef}
        width={stageW} height={stageH}
        onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown} onTouchMove={handleStageMouseMove} onTouchEnd={handleStageMouseUp}
        onClick={handleStageClick} onTap={handleStageClick}
      >
        <Layer listening={false}><SportField sc={sc} sport={sport} fieldType={fieldType} /></Layer>

        {/* Ghost arrows */}
        <Layer listening={false}>
          {ghostPieces?.map((ghost) => {
            const current = pieces.find((p) => p.id === ghost.id);
            if (!current) return null;
            const dx = current.x - ghost.x, dy = current.y - ghost.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1) return null;
            return (
              <Arrow key={`ga-${ghost.id}`}
                points={[sc.x(ghost.x), sc.y(ghost.y), sc.x(current.x), sc.y(current.y)]}
                stroke={ghost.team === "home" ? (homeColor || "#2563eb") : (awayColor || "#ef4444")}
                strokeWidth={2} pointerLength={8} pointerWidth={8} dash={[6, 4]} opacity={0.5} />
            );
          })}
        </Layer>

        {/* User arrows */}
        <Layer>
          {arrows?.map((arrow) => (
            <TacticArrow key={arrow.id} arrow={arrow} sc={sc} tool={tool} onDelete={onArrowDelete} sport={sport} />
          ))}
          {/* Preview arrow being drawn */}
          {drawingArrow && (
            <TacticArrow
              arrow={{ id: "preview", ...drawingArrow, color: "#ffffff", style: previewStyle }}
              sc={sc} tool="select" onDelete={() => {}} sport={sport} />
          )}
        </Layer>

        {/* Ghost pieces */}
        <Layer listening={false}>
          {ghostPieces?.map((ghost) => {
            const current = pieces.find((p) => p.id === ghost.id);
            if (!current) return null;
            const dx = current.x - ghost.x, dy = current.y - ghost.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1) return null;
            return (
              <PlayerPiece key={`g-${ghost.id}`} piece={ghost} x={ghost.x} y={ghost.y}
                sc={sc} draggable={false} isGhost={true} homeColor={homeColor} awayColor={awayColor} pitchBounds={sportPitch} sport={sport} />
            );
          })}
        </Layer>

        {/* Active pieces */}
        <Layer>
          {pieces?.map((piece) => (
            <PlayerPiece key={piece.id} piece={piece} x={piece.x} y={piece.y}
              sc={sc} draggable={!isPlaying && tool === "select"} isGhost={false}
              isSelected={selectedPieceId === piece.id}
              homeColor={homeColor} awayColor={awayColor}
              onDragEnd={onPieceMove} onSelect={onPieceSelect} pitchBounds={sportPitch}
              isRotated={isRotated} stageHeight={stageH} sport={sport} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
