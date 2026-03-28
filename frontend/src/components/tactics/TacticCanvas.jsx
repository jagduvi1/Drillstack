import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Group, RegularPolygon } from "react-konva";

// ── Pitch dimensions in meters ──────────────────────────────────────────────
const PITCH = { width: 105, height: 68 };

// Field configs for partial views (in meters)
const FIELD_CONFIGS = {
  full:  { x: 0, y: 0, w: 105, h: 68 },
  half:  { x: 52.5, y: 0, w: 52.5, h: 68 },
  third: { x: 70, y: 0, w: 35, h: 68 },
  blank: { x: 0, y: 0, w: 40, h: 40 },
};

// ── Drawing tool → arrow style mapping ──────────────────────────────────────
export const DRAW_TOOLS = ["arrow", "pass", "dribble", "dashedArrow", "ballPass"];

function createScale(canvasW, canvasH, fieldType = "full", padding = 30, zoom = 1, panX = 0, panY = 0) {
  const cfg = FIELD_CONFIGS[fieldType] || FIELD_CONFIGS.full;
  const baseScaleX = (canvasW - 2 * padding) / cfg.w;
  const baseScaleY = (canvasH - 2 * padding) / cfg.h;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  // Apply zoom: multiply the pixel-per-meter scale
  const scale = baseScale * zoom;

  const fieldW = cfg.w * scale;
  const fieldH = cfg.h * scale;

  // Center the zoomed field, then apply pan offset
  const offsetX = (canvasW - fieldW) / 2 + panX;
  const offsetY = (canvasH - fieldH) / 2 + panY;

  return {
    x: (m) => offsetX + (m - cfg.x) * scale,
    y: (m) => offsetY + m * scale,
    s: (m) => m * scale,
    inv: (px, py) => [(px - offsetX) / scale + cfg.x, (py - offsetY) / scale],
    fieldX: offsetX,
    fieldY: offsetY,
    fieldW,
    fieldH,
    canvasW,
    canvasH,
    cfg,
    scale,
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

// ── Football Field ──────────────────────────────────────────────────────────
function FootballField({ sc, fieldType }) {
  const cfg = sc.cfg;

  // Blank mode — just a plain green surface with a subtle border
  if (fieldType === "blank") {
    return (
      <Group listening={false}>
        <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill="#1a472a" />
        <Rect x={sc.fieldX} y={sc.fieldY} width={sc.fieldW} height={sc.fieldH} fill="#2d8a4e" cornerRadius={8} />
        <Rect x={sc.fieldX} y={sc.fieldY} width={sc.fieldW} height={sc.fieldH}
          stroke="rgba(255,255,255,0.25)" strokeWidth={2} cornerRadius={8} />
      </Group>
    );
  }

  const w = PITCH.width;
  const h = PITCH.height;
  const lw = 2;
  const lc = "rgba(255,255,255,0.8)";

  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;

  const stripes = [];
  const stripeCount = 10;
  const sw = w / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    const sx = i * sw;
    if (!vis(sx, sx + sw)) continue;
    stripes.push(
      <Rect key={`s${i}`} x={sc.x(sx)} y={sc.fieldY} width={sc.s(sw)} height={sc.fieldH}
        fill={i % 2 === 0 ? "#2d8a4e" : "#339956"} />
    );
  }

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill="#1a472a" />
      {stripes}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {vis(52.5, 52.5) && (
        <Line points={[sc.x(52.5), sc.y(0), sc.x(52.5), sc.y(h)]} stroke={lc} strokeWidth={lw} />
      )}
      {vis(52.5 - 9.15, 52.5 + 9.15) && (
        <>
          <Circle x={sc.x(52.5)} y={sc.y(h / 2)} radius={sc.s(9.15)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(52.5)} y={sc.y(h / 2)} radius={3} fill={lc} />
        </>
      )}

      {vis(0, 16.5) && (
        <>
          <Rect x={sc.x(0)} y={sc.y((h - 40.32) / 2)} width={sc.s(16.5)} height={sc.s(40.32)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(0)} y={sc.y((h - 18.32) / 2)} width={sc.s(5.5)} height={sc.s(18.32)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(11)} y={sc.y(h / 2)} radius={3} fill={lc} />
          <Line points={arcPoints(sc.x(11), sc.y(h / 2), sc.s(9.15), -53, 53)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(0) - sc.s(2.5)} y={sc.y((h - 7.32) / 2)} width={sc.s(2.5)} height={sc.s(7.32)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}

      {vis(w - 16.5, w) && (
        <>
          <Rect x={sc.x(w - 16.5)} y={sc.y((h - 40.32) / 2)} width={sc.s(16.5)} height={sc.s(40.32)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(w - 5.5)} y={sc.y((h - 18.32) / 2)} width={sc.s(5.5)} height={sc.s(18.32)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(w - 11)} y={sc.y(h / 2)} radius={3} fill={lc} />
          <Line points={arcPoints(sc.x(w - 11), sc.y(h / 2), sc.s(9.15), 127, 233)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(w)} y={sc.y((h - 7.32) / 2)} width={sc.s(2.5)} height={sc.s(7.32)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}

      {vis(0, 1) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(0), sc.s(1), 0, 90)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(0), sc.y(h), sc.s(1), -90, 0)} stroke={lc} strokeWidth={lw} />
        </>
      )}
      {vis(w - 1, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(0), sc.s(1), 90, 180)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(w), sc.y(h), sc.s(1), 180, 270)} stroke={lc} strokeWidth={lw} />
        </>
      )}
    </Group>
  );
}

// ── Player / Ball / Cone Piece ──────────────────────────────────────────────
function PlayerPiece({ piece, x, y, sc, draggable, isGhost, isSelected, homeColor, awayColor, onDragEnd, onSelect }) {
  const radius = sc.s(1.8);
  const px = sc.x(x);
  const py = sc.y(y);

  const getColor = () => {
    if (piece.type === "ball") return "#ffffff";
    if (piece.type === "cone") return "#ff8c00";
    if (piece.isGK) return piece.team === "home" ? "#eab308" : "#f97316";
    return piece.team === "home" ? (homeColor || "#2563eb") : (awayColor || "#ef4444");
  };

  const isBall = piece.type === "ball";
  const isCone = piece.type === "cone";
  const r = isBall ? radius * 0.65 : isCone ? radius * 0.55 : radius;

  return (
    <Group
      x={px} y={py}
      draggable={draggable && !isGhost}
      opacity={isGhost ? 0.3 : 1}
      onDragEnd={(e) => {
        const [mx, my] = sc.inv(e.target.x(), e.target.y());
        onDragEnd?.(piece.id, Math.max(-3, Math.min(PITCH.width + 3, mx)), Math.max(-3, Math.min(PITCH.height + 3, my)));
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
function TacticArrow({ arrow, sc, tool, onDelete }) {
  const x1 = sc.x(arrow.fromX), y1 = sc.y(arrow.fromY);
  const x2 = sc.x(arrow.toX), y2 = sc.y(arrow.toY);
  const color = arrow.color || "#ffffff";
  const handleClick = () => { if (tool === "eraser") onDelete?.(arrow.id); };

  if (arrow.style === "dribble") {
    // Wavy line + arrowhead
    const pts = wavyLinePoints(x1, y1, x2, y2, 6, 5);
    return (
      <Group>
        <Line points={pts} stroke={color} strokeWidth={3} hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
        <Arrow points={[x1 + (x2 - x1) * 0.85, y1 + (y2 - y1) * 0.85, x2, y2]}
          stroke={color} strokeWidth={3} pointerLength={10} pointerWidth={10}
          hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
      </Group>
    );
  }

  if (arrow.style === "pass") {
    return (
      <Arrow points={[x1, y1, x2, y2]} stroke={color} strokeWidth={2}
        pointerLength={8} pointerWidth={8} dash={[3, 5]}
        hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
    );
  }

  if (arrow.style === "ballPass") {
    // Ball movement line: thicker dotted with filled arrowhead
    return (
      <Arrow points={[x1, y1, x2, y2]} stroke="#fbbf24" fill="#fbbf24" strokeWidth={3}
        pointerLength={10} pointerWidth={10} dash={[6, 4]}
        hitStrokeWidth={14} onClick={handleClick} onTap={handleClick} />
    );
  }

  // solid or dashed
  return (
    <Arrow points={[x1, y1, x2, y2]} stroke={color} strokeWidth={3}
      pointerLength={10} pointerWidth={10}
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
}) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panState = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const cfg = FIELD_CONFIGS[fieldType] || FIELD_CONFIGS.full;
      const maxH = fieldType === "blank" ? window.innerHeight * 0.75 : window.innerHeight * 0.65;
      const h = Math.min(width * (cfg.h / cfg.w), maxH);
      setDims({ width, height: h });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [fieldType]);

  const stageW = dims.width;
  const stageH = dims.height;

  // Reset pan when zoom changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  // Zoom is baked into the coordinate scale — no Stage transforms needed
  const sc = createScale(stageW, stageH, fieldType, 30, zoom, panOffset.x, panOffset.y);

  const isDrawTool = DRAW_TOOLS.includes(tool);
  const canPan = zoom !== 1;

  // Compute pan limits independently of sc (avoids circular deps)
  const panLimits = (() => {
    const cfg = FIELD_CONFIGS[fieldType] || FIELD_CONFIGS.full;
    const bs = Math.min((stageW - 60) / cfg.w, (stageH - 60) / cfg.h);
    const fw = cfg.w * bs * zoom;
    const fh = cfg.h * bs * zoom;
    return { x: Math.abs(fw - stageW) / 2, y: Math.abs(fh - stageH) / 2 };
  })();

  // Convert pointer position to field meters
  const pointerToField = useCallback((e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    return sc.inv(pos.x, pos.y);
  }, [sc]);

  // ── Pan helper (shared by Stage events and window events) ──────────
  const applyPan = useCallback((clientX, clientY) => {
    if (!panState.current) return;
    const dx = clientX - panState.current.startX;
    const dy = clientY - panState.current.startY;
    setPanOffset({
      x: Math.max(-panLimits.x, Math.min(panLimits.x, panState.current.origX + dx)),
      y: Math.max(-panLimits.y, Math.min(panLimits.y, panState.current.origY + dy)),
    });
  }, [panLimits]);

  const endPan = useCallback(() => {
    if (!panState.current) return;
    panState.current = null;
    if (containerRef.current) containerRef.current.style.cursor = canPan ? "grab" : "";
  }, [canPan]);

  // ── Stage mouse handlers (drawing + pan) ──────────────────────────────
  const handleStageMouseDown = useCallback((e) => {
    const btn = e.evt.button;

    // Pan: right-click or middle-click anywhere when zoom != 1
    // Also: left-click on empty background (not on a piece) when not drawing
    if (canPan) {
      const isRightOrMiddle = btn === 1 || btn === 2;
      const isBackground = e.target === e.target.getStage();
      const isBgLeft = btn === 0 && isBackground && !isDrawTool;
      if (isRightOrMiddle || isBgLeft) {
        e.evt.preventDefault();
        panState.current = { startX: e.evt.clientX, startY: e.evt.clientY, origX: panOffset.x, origY: panOffset.y };
        containerRef.current.style.cursor = "grabbing";
        return;
      }
    }

    // Drawing arrows (left-click only)
    if (!isDrawTool || btn !== 0) return;
    const [mx, my] = pointerToField(e);
    setDrawingArrow({ fromX: mx, fromY: my, toX: mx, toY: my });
  }, [isDrawTool, pointerToField, canPan, panOffset]);

  const handleStageMouseMove = useCallback((e) => {
    // Pan movement (handled in Stage events for responsiveness)
    if (panState.current) {
      applyPan(e.evt.clientX, e.evt.clientY);
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
    if (Math.sqrt(dx * dx + dy * dy) > 2) {
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
        width={stageW} height={stageH}
        onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown} onTouchMove={handleStageMouseMove} onTouchEnd={handleStageMouseUp}
        onClick={handleStageClick} onTap={handleStageClick}
      >
        <Layer listening={false}><FootballField sc={sc} fieldType={fieldType} /></Layer>

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
            <TacticArrow key={arrow.id} arrow={arrow} sc={sc} tool={tool} onDelete={onArrowDelete} />
          ))}
          {/* Preview arrow being drawn */}
          {drawingArrow && (
            <TacticArrow
              arrow={{ id: "preview", ...drawingArrow, color: "#ffffff", style: previewStyle }}
              sc={sc} tool="select" onDelete={() => {}} />
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
                sc={sc} draggable={false} isGhost={true} homeColor={homeColor} awayColor={awayColor} />
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
              onDragEnd={onPieceMove} onSelect={onPieceSelect} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

// ── Formation presets ───────────────────────────────────────────────────────
export const FORMATIONS = {
  "4-4-2": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "RM", x: 40, y: 10 },
    { role: "CM", x: 38, y: 28 }, { role: "CM", x: 38, y: 40 }, { role: "LM", x: 40, y: 58 },
    { role: "ST", x: 52, y: 28 }, { role: "ST", x: 52, y: 40 },
  ],
  "4-3-3": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "CDM", x: 35, y: 34 },
    { role: "CM", x: 42, y: 20 }, { role: "CM", x: 42, y: 48 }, { role: "RW", x: 55, y: 10 },
    { role: "ST", x: 55, y: 34 }, { role: "LW", x: 55, y: 58 },
  ],
  "3-5-2": [
    { role: "GK", x: 5, y: 34 }, { role: "CB", x: 18, y: 17 }, { role: "CB", x: 16, y: 34 },
    { role: "CB", x: 18, y: 51 }, { role: "RWB", x: 36, y: 5 }, { role: "CM", x: 34, y: 22 },
    { role: "CDM", x: 30, y: 34 }, { role: "CM", x: 34, y: 46 }, { role: "LWB", x: 36, y: 63 },
    { role: "ST", x: 52, y: 26 }, { role: "ST", x: 52, y: 42 },
  ],
  "4-2-3-1": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "CDM", x: 33, y: 26 },
    { role: "CDM", x: 33, y: 42 }, { role: "RW", x: 48, y: 12 }, { role: "CAM", x: 46, y: 34 },
    { role: "LW", x: 48, y: 56 }, { role: "ST", x: 55, y: 34 },
  ],
  "3-4-3": [
    { role: "GK", x: 5, y: 34 }, { role: "CB", x: 18, y: 17 }, { role: "CB", x: 16, y: 34 },
    { role: "CB", x: 18, y: 51 }, { role: "RM", x: 38, y: 8 }, { role: "CM", x: 35, y: 26 },
    { role: "CM", x: 35, y: 42 }, { role: "LM", x: 38, y: 60 }, { role: "RW", x: 55, y: 12 },
    { role: "ST", x: 55, y: 34 }, { role: "LW", x: 55, y: 56 },
  ],
  "5-3-2": [
    { role: "GK", x: 5, y: 34 }, { role: "RWB", x: 24, y: 5 }, { role: "CB", x: 17, y: 20 },
    { role: "CB", x: 15, y: 34 }, { role: "CB", x: 17, y: 48 }, { role: "LWB", x: 24, y: 63 },
    { role: "CM", x: 38, y: 20 }, { role: "CM", x: 36, y: 34 }, { role: "CM", x: 38, y: 48 },
    { role: "ST", x: 52, y: 26 }, { role: "ST", x: 52, y: 42 },
  ],
};

export function buildFormationPieces(team, formation) {
  const positions = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  return positions.map((pos, i) => ({
    id: `${team}-${i}`,
    type: "player",
    team,
    isGK: i === 0,
    label: i === 0 ? "GK" : String(i),
    x: team === "away" ? PITCH.width - pos.x : pos.x,
    y: pos.y,
  }));
}

export function createInitialStep(homeFormation = "4-4-2", awayFormation = "4-4-2") {
  return {
    id: "step-0",
    label: "Setup",
    duration: 1500,
    pieces: [
      ...buildFormationPieces("home", homeFormation),
      ...buildFormationPieces("away", awayFormation),
      { id: "ball", type: "ball", team: "neutral", label: "", x: PITCH.width / 2, y: PITCH.height / 2 },
    ],
    arrows: [],
  };
}
