import { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Group, RegularPolygon } from "react-konva";
import { SPORT_CONFIGS, DRAW_TOOLS, getPitch } from "./sportConfigs";

// Re-export for consumers that import from TacticCanvas
export { FORMATIONS, DRAW_TOOLS, createInitialStep, buildFormationPieces, SPORT_CONFIGS, SPORT_FORMATIONS, getFormations, getDefaultFormation, getPitch } from "./sportConfigs";

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

  // Field always fills the canvas at base scale
  const scale = baseScale;

  const fieldW = cfg.w * scale;
  const fieldH = cfg.h * scale;

  const offsetX = (canvasW - fieldW) / 2;
  const offsetY = (canvasH - fieldH) / 2;

  // Element scale: zoom only affects players, arrows, and other pieces
  const elemScale = baseScale * zoom;

  return {
    x: (m) => offsetX + (m - cfg.x) * scale,
    y: (m) => offsetY + m * scale,
    s: (m) => m * scale,
    es: (m) => m * elemScale,        // element scale (affected by zoom)
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

// ── Blank field (any sport) ─────────────────────────────────────────────────
function BlankField({ sc, sportCfg }) {
  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <Rect x={sc.fieldX} y={sc.fieldY} width={sc.fieldW} height={sc.fieldH} fill={sportCfg.fieldColor1} cornerRadius={8} />
      <Rect x={sc.fieldX} y={sc.fieldY} width={sc.fieldW} height={sc.fieldH}
        stroke="rgba(255,255,255,0.25)" strokeWidth={2} cornerRadius={8} />
    </Group>
  );
}

// ── Striped background helper ──────────────────────────────────────────────
function StripedBg({ sc, sportCfg, stripeCount = 10 }) {
  const w = sportCfg.width;
  const cfg = sc.cfg;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;
  const sw = w / stripeCount;
  const stripes = [];
  for (let i = 0; i < stripeCount; i++) {
    const sx = i * sw;
    if (!vis(sx, sx + sw)) continue;
    stripes.push(
      <Rect key={`s${i}`} x={sc.x(sx)} y={sc.fieldY} width={sc.s(sw)} height={sc.fieldH}
        fill={i % 2 === 0 ? sportCfg.fieldColor1 : sportCfg.fieldColor2} />
    );
  }
  return <>{stripes}</>;
}

// ── Football Field (scales to any pitch size) ──────────────────────────────
function FootballField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width;
  const h = sportCfg.height;
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;

  // Scale markings proportionally — reference: 105×68 standard
  const s = w / 105; // scale factor vs full-size pitch
  const cx = w / 2;       // center x
  const cy = h / 2;       // center y
  const circR = 9.15 * s; // center circle radius
  const penD = 16.5 * s;  // penalty area depth
  const penW = 40.32 * s; // penalty area width
  const goalD = 5.5 * s;  // goal area depth
  const goalW = 18.32 * s;// goal area width
  const penSpot = 11 * s; // penalty spot distance
  const goalPostW = 7.32 * s; // goal width
  const goalNetD = 2.5 * s;   // goal net depth
  const cornerR = 1 * s;  // corner arc radius

  // Only show penalty areas if they fit (not bigger than half the pitch)
  const showPenalty = penD < w / 2 && penW < h;

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <StripedBg sc={sc} sportCfg={sportCfg} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Center line */}
      {vis(cx, cx) && (
        <Line points={[sc.x(cx), sc.y(0), sc.x(cx), sc.y(h)]} stroke={lc} strokeWidth={lw} />
      )}
      {/* Center circle */}
      {vis(cx - circR, cx + circR) && (
        <>
          <Circle x={sc.x(cx)} y={sc.y(cy)} radius={sc.s(circR)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(cx)} y={sc.y(cy)} radius={3} fill={lc} />
        </>
      )}

      {/* Left penalty area */}
      {showPenalty && vis(0, penD) && (
        <>
          <Rect x={sc.x(0)} y={sc.y((h - penW) / 2)} width={sc.s(penD)} height={sc.s(penW)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(0)} y={sc.y((h - goalW) / 2)} width={sc.s(goalD)} height={sc.s(goalW)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(penSpot)} y={sc.y(cy)} radius={3} fill={lc} />
          <Line points={arcPoints(sc.x(penSpot), sc.y(cy), sc.s(circR), -53, 53)} stroke={lc} strokeWidth={lw} />
        </>
      )}
      {/* Left goal */}
      {vis(0, 0) && (
        <Rect x={sc.x(0) - sc.s(goalNetD)} y={sc.y((h - goalPostW) / 2)} width={sc.s(goalNetD)} height={sc.s(goalPostW)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
      )}

      {/* Right penalty area */}
      {showPenalty && vis(w - penD, w) && (
        <>
          <Rect x={sc.x(w - penD)} y={sc.y((h - penW) / 2)} width={sc.s(penD)} height={sc.s(penW)} stroke={lc} strokeWidth={lw} />
          <Rect x={sc.x(w - goalD)} y={sc.y((h - goalW) / 2)} width={sc.s(goalD)} height={sc.s(goalW)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(w - penSpot)} y={sc.y(cy)} radius={3} fill={lc} />
          <Line points={arcPoints(sc.x(w - penSpot), sc.y(cy), sc.s(circR), 127, 233)} stroke={lc} strokeWidth={lw} />
        </>
      )}
      {/* Right goal */}
      {vis(w, w) && (
        <Rect x={sc.x(w)} y={sc.y((h - goalPostW) / 2)} width={sc.s(goalNetD)} height={sc.s(goalPostW)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
      )}

      {/* Corner arcs */}
      {vis(0, cornerR) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(0), sc.s(cornerR), 0, 90)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(0), sc.y(h), sc.s(cornerR), -90, 0)} stroke={lc} strokeWidth={lw} />
        </>
      )}
      {vis(w - cornerR, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(0), sc.s(cornerR), 90, 180)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(w), sc.y(h), sc.s(cornerR), 180, 270)} stroke={lc} strokeWidth={lw} />
        </>
      )}
    </Group>
  );
}

// ── Handball Court ──────────────────────────────────────────────────────────
function HandballField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width; // 40m
  const h = sportCfg.height; // 20m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <StripedBg sc={sc} sportCfg={sportCfg} stripeCount={8} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Center line */}
      {vis(20, 20) && (
        <Line points={[sc.x(20), sc.y(0), sc.x(20), sc.y(h)]} stroke={lc} strokeWidth={lw} />
      )}
      {/* Center circle */}
      <Circle x={sc.x(20)} y={sc.y(h / 2)} radius={3} fill={lc} />

      {/* Left goal area — 6m arc (D-shape) */}
      {vis(0, 6) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(h / 2), sc.s(6), -90, 90)} stroke={lc} strokeWidth={lw} />
          {/* 9m dashed free-throw line */}
          <Line points={arcPoints(sc.x(0), sc.y(h / 2), sc.s(9), -90, 90)} stroke={lc} strokeWidth={lw} dash={[8, 6]} />
          {/* 7m penalty mark */}
          <Line points={[sc.x(7) - 4, sc.y(h / 2), sc.x(7) + 4, sc.y(h / 2)]} stroke={lc} strokeWidth={3} />
          {/* Goal (3m wide) */}
          <Rect x={sc.x(0) - sc.s(1.5)} y={sc.y((h - 3) / 2)} width={sc.s(1.5)} height={sc.s(3)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}

      {/* Right goal area */}
      {vis(w - 6, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(h / 2), sc.s(6), 90, 270)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(w), sc.y(h / 2), sc.s(9), 90, 270)} stroke={lc} strokeWidth={lw} dash={[8, 6]} />
          <Line points={[sc.x(w - 7) - 4, sc.y(h / 2), sc.x(w - 7) + 4, sc.y(h / 2)]} stroke={lc} strokeWidth={3} />
          <Rect x={sc.x(w)} y={sc.y((h - 3) / 2)} width={sc.s(1.5)} height={sc.s(3)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}
    </Group>
  );
}

// ── Ice Hockey Rink ─────────────────────────────────────────────────────────
function HockeyField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width; // 60m
  const h = sportCfg.height; // 26m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;
  const cornerR = 8.5; // rounded corners

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      {/* Ice surface with rounded corners */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)}
        fill={sportCfg.fieldColor1} cornerRadius={sc.s(cornerR)} />

      {/* Rink border */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)}
        stroke="#555" strokeWidth={3} cornerRadius={sc.s(cornerR)} />

      {/* Center red line */}
      {vis(30, 30) && (
        <Line points={[sc.x(30), sc.y(0), sc.x(30), sc.y(h)]} stroke="#cc0000" strokeWidth={3} />
      )}

      {/* Center circle */}
      <Circle x={sc.x(30)} y={sc.y(h / 2)} radius={sc.s(4.5)} stroke="#0066cc" strokeWidth={lw} />
      <Circle x={sc.x(30)} y={sc.y(h / 2)} radius={4} fill="#0066cc" />

      {/* Blue lines */}
      {vis(17.5, 17.5) && (
        <Line points={[sc.x(17.5), sc.y(0), sc.x(17.5), sc.y(h)]} stroke="#0066cc" strokeWidth={4} />
      )}
      {vis(42.5, 42.5) && (
        <Line points={[sc.x(42.5), sc.y(0), sc.x(42.5), sc.y(h)]} stroke="#0066cc" strokeWidth={4} />
      )}

      {/* Left faceoff circles + dots */}
      {vis(0, 12) && (
        <>
          <Circle x={sc.x(7)} y={sc.y(6.5)} radius={sc.s(4.5)} stroke="#cc0000" strokeWidth={lw} />
          <Circle x={sc.x(7)} y={sc.y(6.5)} radius={3} fill="#cc0000" />
          <Circle x={sc.x(7)} y={sc.y(h - 6.5)} radius={sc.s(4.5)} stroke="#cc0000" strokeWidth={lw} />
          <Circle x={sc.x(7)} y={sc.y(h - 6.5)} radius={3} fill="#cc0000" />
          {/* Goal crease */}
          <Line points={arcPoints(sc.x(0), sc.y(h / 2), sc.s(1.8), -90, 90)} stroke="#cc0000" strokeWidth={lw} />
          <Rect x={sc.x(0) - sc.s(1)} y={sc.y((h - 1.8) / 2)} width={sc.s(1)} height={sc.s(1.8)} fill="rgba(204,0,0,0.15)" stroke="#cc0000" strokeWidth={lw} />
        </>
      )}

      {/* Right faceoff circles + dots */}
      {vis(w - 12, w) && (
        <>
          <Circle x={sc.x(w - 7)} y={sc.y(6.5)} radius={sc.s(4.5)} stroke="#cc0000" strokeWidth={lw} />
          <Circle x={sc.x(w - 7)} y={sc.y(6.5)} radius={3} fill="#cc0000" />
          <Circle x={sc.x(w - 7)} y={sc.y(h - 6.5)} radius={sc.s(4.5)} stroke="#cc0000" strokeWidth={lw} />
          <Circle x={sc.x(w - 7)} y={sc.y(h - 6.5)} radius={3} fill="#cc0000" />
          <Line points={arcPoints(sc.x(w), sc.y(h / 2), sc.s(1.8), 90, 270)} stroke="#cc0000" strokeWidth={lw} />
          <Rect x={sc.x(w)} y={sc.y((h - 1.8) / 2)} width={sc.s(1)} height={sc.s(1.8)} fill="rgba(204,0,0,0.15)" stroke="#cc0000" strokeWidth={lw} />
        </>
      )}

      {/* Neutral zone dots */}
      {vis(22, 22) && (
        <>
          <Circle x={sc.x(22)} y={sc.y(6.5)} radius={3} fill="#cc0000" />
          <Circle x={sc.x(22)} y={sc.y(h - 6.5)} radius={3} fill="#cc0000" />
        </>
      )}
      {vis(38, 38) && (
        <>
          <Circle x={sc.x(38)} y={sc.y(6.5)} radius={3} fill="#cc0000" />
          <Circle x={sc.x(38)} y={sc.y(h - 6.5)} radius={3} fill="#cc0000" />
        </>
      )}

      {/* Goal lines */}
      {vis(4, 4) && (
        <Line points={[sc.x(4), sc.y(0), sc.x(4), sc.y(h)]} stroke="#cc0000" strokeWidth={lw} />
      )}
      {vis(w - 4, w - 4) && (
        <Line points={[sc.x(w - 4), sc.y(0), sc.x(w - 4), sc.y(h)]} stroke="#cc0000" strokeWidth={lw} />
      )}
    </Group>
  );
}

// ── Basketball Court ────────────────────────────────────────────────────────
function BasketballField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width; // 28m
  const h = sportCfg.height; // 15m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} fill={sportCfg.fieldColor1} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Center line & circle */}
      {vis(14, 14) && (
        <>
          <Line points={[sc.x(14), sc.y(0), sc.x(14), sc.y(h)]} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(14)} y={sc.y(h / 2)} radius={sc.s(1.8)} stroke={lc} strokeWidth={lw} />
        </>
      )}

      {/* Left paint / key (5.8m wide, 4.6m from baseline) */}
      {vis(0, 5.8) && (
        <>
          <Rect x={sc.x(0)} y={sc.y((h - 4.9) / 2)} width={sc.s(5.8)} height={sc.s(4.9)} stroke={lc} strokeWidth={lw} />
          {/* Free throw circle */}
          <Circle x={sc.x(5.8)} y={sc.y(h / 2)} radius={sc.s(1.8)} stroke={lc} strokeWidth={lw} />
          {/* 3-point arc */}
          <Line points={arcPoints(sc.x(1.575), sc.y(h / 2), sc.s(6.75), -80, 80)} stroke={lc} strokeWidth={lw} />
          {/* Basket */}
          <Circle x={sc.x(1.575)} y={sc.y(h / 2)} radius={sc.s(0.23)} fill={lc} />
          {/* Backboard line */}
          <Line points={[sc.x(1.2), sc.y(h / 2 - 0.9), sc.x(1.2), sc.y(h / 2 + 0.9)]} stroke={lc} strokeWidth={3} />
        </>
      )}

      {/* Right paint / key */}
      {vis(w - 5.8, w) && (
        <>
          <Rect x={sc.x(w - 5.8)} y={sc.y((h - 4.9) / 2)} width={sc.s(5.8)} height={sc.s(4.9)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(w - 5.8)} y={sc.y(h / 2)} radius={sc.s(1.8)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(w - 1.575), sc.y(h / 2), sc.s(6.75), 100, 260)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(w - 1.575)} y={sc.y(h / 2)} radius={sc.s(0.23)} fill={lc} />
          <Line points={[sc.x(w - 1.2), sc.y(h / 2 - 0.9), sc.x(w - 1.2), sc.y(h / 2 + 0.9)]} stroke={lc} strokeWidth={3} />
        </>
      )}
    </Group>
  );
}

// ── Futsal Court ────────────────────────────────────────────────────────────
function FutsalField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width; // 40m
  const h = sportCfg.height; // 20m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <StripedBg sc={sc} sportCfg={sportCfg} stripeCount={8} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Center line & circle */}
      {vis(20, 20) && (
        <>
          <Line points={[sc.x(20), sc.y(0), sc.x(20), sc.y(h)]} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(20)} y={sc.y(h / 2)} radius={sc.s(3)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(20)} y={sc.y(h / 2)} radius={3} fill={lc} />
        </>
      )}

      {/* Left penalty area — D-shaped 6m arc */}
      {vis(0, 6) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(h / 2), sc.s(6), -90, 90)} stroke={lc} strokeWidth={lw} />
          {/* Penalty spot (6m) */}
          <Circle x={sc.x(6)} y={sc.y(h / 2)} radius={3} fill={lc} />
          {/* Second penalty spot (10m) */}
          <Circle x={sc.x(10)} y={sc.y(h / 2)} radius={3} fill={lc} />
          {/* Goal (3m wide) */}
          <Rect x={sc.x(0) - sc.s(1.5)} y={sc.y((h - 3) / 2)} width={sc.s(1.5)} height={sc.s(3)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}

      {/* Right penalty area */}
      {vis(w - 6, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(h / 2), sc.s(6), 90, 270)} stroke={lc} strokeWidth={lw} />
          <Circle x={sc.x(w - 6)} y={sc.y(h / 2)} radius={3} fill={lc} />
          <Circle x={sc.x(w - 10)} y={sc.y(h / 2)} radius={3} fill={lc} />
          <Rect x={sc.x(w)} y={sc.y((h - 3) / 2)} width={sc.s(1.5)} height={sc.s(3)} fill="rgba(255,255,255,0.12)" stroke={lc} strokeWidth={lw} />
        </>
      )}

      {/* Corner arcs */}
      {vis(0, 0.25) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(0), sc.s(0.25), 0, 90)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(0), sc.y(h), sc.s(0.25), -90, 0)} stroke={lc} strokeWidth={lw} />
        </>
      )}
      {vis(w - 0.25, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(0), sc.s(0.25), 90, 180)} stroke={lc} strokeWidth={lw} />
          <Line points={arcPoints(sc.x(w), sc.y(h), sc.s(0.25), 180, 270)} stroke={lc} strokeWidth={lw} />
        </>
      )}
    </Group>
  );
}

// ── Floorball Rink ──────────────────────────────────────────────────────────
function FloorballField({ sc, sportCfg }) {
  const cfg = sc.cfg;
  const w = sportCfg.width; // 40m
  const h = sportCfg.height; // 20m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const vis = (minX, maxX) => maxX >= cfg.x && minX <= cfg.x + cfg.w;
  const cornerR = 3; // rounded corners for boards

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)}
        fill={sportCfg.fieldColor1} cornerRadius={sc.s(cornerR)} />
      {/* Board outline */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)}
        stroke="#8B7355" strokeWidth={4} cornerRadius={sc.s(cornerR)} />

      {/* Center line */}
      {vis(20, 20) && (
        <Line points={[sc.x(20), sc.y(0), sc.x(20), sc.y(h)]} stroke={lc} strokeWidth={lw} />
      )}
      {/* Center circle */}
      <Circle x={sc.x(20)} y={sc.y(h / 2)} radius={sc.s(3)} stroke={lc} strokeWidth={lw} />
      <Circle x={sc.x(20)} y={sc.y(h / 2)} radius={3} fill={lc} />

      {/* Left goal crease — semicircle 4m radius */}
      {vis(0, 4.5) && (
        <>
          <Line points={arcPoints(sc.x(0), sc.y(h / 2), sc.s(4.5), -90, 90)} stroke="#cc0000" strokeWidth={lw} />
          {/* Goal (1.6m wide) */}
          <Rect x={sc.x(0) - sc.s(1)} y={sc.y((h - 1.6) / 2)} width={sc.s(1)} height={sc.s(1.6)} fill="rgba(204,0,0,0.15)" stroke="#cc0000" strokeWidth={lw} />
        </>
      )}

      {/* Right goal crease */}
      {vis(w - 4.5, w) && (
        <>
          <Line points={arcPoints(sc.x(w), sc.y(h / 2), sc.s(4.5), 90, 270)} stroke="#cc0000" strokeWidth={lw} />
          <Rect x={sc.x(w)} y={sc.y((h - 1.6) / 2)} width={sc.s(1)} height={sc.s(1.6)} fill="rgba(204,0,0,0.15)" stroke="#cc0000" strokeWidth={lw} />
        </>
      )}
    </Group>
  );
}

// ── Volleyball Court ────────────────────────────────────────────────────────
function VolleyballField({ sc, sportCfg }) {
  const w = sportCfg.width; // 18m
  const h = sportCfg.height; // 9m
  const lw = 2;
  const lc = sportCfg.lineColor;

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      {/* Left half (home) */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(9)} height={sc.s(h)} fill={sportCfg.fieldColor1} />
      {/* Right half (away) */}
      <Rect x={sc.x(9)} y={sc.y(0)} width={sc.s(9)} height={sc.s(h)} fill={sportCfg.fieldColor2} />
      {/* Court outline */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Center line (net) */}
      <Line points={[sc.x(9), sc.y(0), sc.x(9), sc.y(h)]} stroke={lc} strokeWidth={3} />

      {/* 3m attack lines */}
      <Line points={[sc.x(6), sc.y(0), sc.x(6), sc.y(h)]} stroke={lc} strokeWidth={lw} dash={[8, 4]} />
      <Line points={[sc.x(12), sc.y(0), sc.x(12), sc.y(h)]} stroke={lc} strokeWidth={lw} dash={[8, 4]} />
    </Group>
  );
}

// ── Sport field dispatcher ──────────────────────────────────────────────────
function SportField({ sc, sport, fieldType }) {
  const sportCfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;

  if (fieldType === "blank") {
    return <BlankField sc={sc} sportCfg={sportCfg} />;
  }

  const renderer = sportCfg.renderer || sport;
  switch (renderer) {
    case "handball": return <HandballField sc={sc} sportCfg={sportCfg} />;
    case "hockey": return <HockeyField sc={sc} sportCfg={sportCfg} />;
    case "basketball": return <BasketballField sc={sc} sportCfg={sportCfg} />;
    case "futsal": return <FutsalField sc={sc} sportCfg={sportCfg} />;
    case "floorball": return <FloorballField sc={sc} sportCfg={sportCfg} />;
    case "volleyball": return <VolleyballField sc={sc} sportCfg={sportCfg} />;
    default: return <FootballField sc={sc} sportCfg={sportCfg} />;
  }
}

// ── Player / Ball / Cone Piece ──────────────────────────────────────────────
function PlayerPiece({ piece, x, y, sc, draggable, isGhost, isSelected, homeColor, awayColor, onDragEnd, onSelect, pitchBounds }) {
  const radius = sc.es(1.8);
  const px = sc.x(x);
  const py = sc.y(y);
  const bounds = pitchBounds || { width: 105, height: 68 };

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
function TacticArrow({ arrow, sc, tool, onDelete }) {
  const x1 = sc.x(arrow.fromX), y1 = sc.y(arrow.fromY);
  const x2 = sc.x(arrow.toX), y2 = sc.y(arrow.toY);
  const color = arrow.color || "#ffffff";
  const handleClick = () => { if (tool === "eraser") onDelete?.(arrow.id); };
  const sw = sc.es(0.4);       // stroke width scaled with zoom
  const pl = sc.es(1.3);       // pointer length
  const pw = sc.es(1.3);       // pointer width

  if (arrow.style === "dribble") {
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
}) {
  const sportCfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;
  const sportPitch = { width: sportCfg.width, height: sportCfg.height };
  const sportFieldConfigs = sportCfg.fieldViews;
  const containerRef = useRef(null);
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

  // Zoom only affects element sizes, field always fills canvas — no panning needed
  const sc = createScale(stageW, stageH, fieldType, 30, zoom, 0, 0, sportFieldConfigs);

  const isDrawTool = DRAW_TOOLS.includes(tool);
  const canPan = false;

  // Compute pan limits independently of sc (avoids circular deps)
  const panLimits = (() => {
    const cfg = sportFieldConfigs[fieldType] || Object.values(sportFieldConfigs)[0];
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
                sc={sc} draggable={false} isGhost={true} homeColor={homeColor} awayColor={awayColor} pitchBounds={sportPitch} />
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
              onDragEnd={onPieceMove} onSelect={onPieceSelect} pitchBounds={sportPitch} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
