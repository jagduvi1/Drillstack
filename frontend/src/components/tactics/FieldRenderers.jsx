import { Rect, Circle, Line, Arrow, Text, Group } from "react-konva";
import { SPORT_CONFIGS } from "./sportConfigs";

// ── Arc helper ──────────────────────────────────────────────────────────────
function arcPoints(cx, cy, r, startDeg, endDeg, n = 30) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((startDeg + (endDeg - startDeg) * (i / n)) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return pts;
}

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


// ── Padel Court ───────────────────────────────────────────────────────────
function PadelField({ sc, sportCfg }) {
  const w = sportCfg.width;  // 20m
  const h = sportCfg.height; // 10m
  const lw = 2;
  const lc = sportCfg.lineColor;
  const cx = w / 2; // 10m — net position

  // Service line is 6.95m from the net → at x = 10-6.95 = 3.05 and x = 10+6.95 = 16.95
  const svc = cx - 6.95; // 3.05m from each back wall

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={sc.canvasW} height={sc.canvasH} fill={sportCfg.bgColor} />
      {/* Court surface — two halves */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(cx)} height={sc.s(h)} fill={sportCfg.fieldColor1} />
      <Rect x={sc.x(cx)} y={sc.y(0)} width={sc.s(cx)} height={sc.s(h)} fill={sportCfg.fieldColor2} />
      {/* Court outline */}
      <Rect x={sc.x(0)} y={sc.y(0)} width={sc.s(w)} height={sc.s(h)} stroke={lc} strokeWidth={lw} />

      {/* Net (center line) */}
      <Line points={[sc.x(cx), sc.y(0), sc.x(cx), sc.y(h)]} stroke={lc} strokeWidth={3} />

      {/* Service lines */}
      <Line points={[sc.x(svc), sc.y(0), sc.x(svc), sc.y(h)]} stroke={lc} strokeWidth={lw} />
      <Line points={[sc.x(w - svc), sc.y(0), sc.x(w - svc), sc.y(h)]} stroke={lc} strokeWidth={lw} />

      {/* Center service lines (T-lines: run from service line to net through each service box) */}
      <Line points={[sc.x(svc), sc.y(h / 2), sc.x(cx), sc.y(h / 2)]} stroke={lc} strokeWidth={lw} />
      <Line points={[sc.x(cx), sc.y(h / 2), sc.x(w - svc), sc.y(h / 2)]} stroke={lc} strokeWidth={lw} />

      {/* Back wall indicators (small marks at court edges) */}
      <Line points={[sc.x(0), sc.y(0), sc.x(0), sc.y(h)]} stroke="rgba(255,255,255,0.5)" strokeWidth={4} />
      <Line points={[sc.x(w), sc.y(0), sc.x(w), sc.y(h)]} stroke="rgba(255,255,255,0.5)" strokeWidth={4} />
      {/* Side wall indicators */}
      <Line points={[sc.x(0), sc.y(0), sc.x(w), sc.y(0)]} stroke="rgba(255,255,255,0.5)" strokeWidth={4} />
      <Line points={[sc.x(0), sc.y(h), sc.x(w), sc.y(h)]} stroke="rgba(255,255,255,0.5)" strokeWidth={4} />
    </Group>
  );
}

// ── Sport field dispatcher ──────────────────────────────────────────────────
function SportField({ sc, sport, fieldType }) {
  const sportCfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;

  if (fieldType === "blank" || sport === "gymnastics") {
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
    case "padel": return <PadelField sc={sc} sportCfg={sportCfg} />;
    default: return <FootballField sc={sc} sportCfg={sportCfg} />;
  }
}

export default SportField;
