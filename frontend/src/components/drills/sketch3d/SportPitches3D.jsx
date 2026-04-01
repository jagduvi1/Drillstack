import { useMemo } from "react";
import * as THREE from "three";

// ── Shared helpers ──────────────────────────────────────────────────────────

function Lines({ points, color = "white", opacity = 0.8 }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

function arcSegments(cx, cz, r, startDeg, endDeg, y = 0.02, n = 32) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a1 = ((startDeg + (endDeg - startDeg) * (i / n)) * Math.PI) / 180;
    const a2 = ((startDeg + (endDeg - startDeg) * ((i + 1) / n)) * Math.PI) / 180;
    pts.push(new THREE.Vector3(cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r));
    pts.push(new THREE.Vector3(cx + Math.cos(a2) * r, y, cz + Math.sin(a2) * r));
  }
  return pts;
}

function addLine(lines, x1, z1, x2, z2, y = 0.02) {
  lines.push(new THREE.Vector3(x1, y, z1));
  lines.push(new THREE.Vector3(x2, y, z2));
}

function Surface({ w, h, color, stripes, stripeColor }) {
  const hw = w / 2, hh = h / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {stripes && Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-hw + (i * 2 + 1) * (w / 20), 0.001, 0]}>
          <planeGeometry args={[w / 10, h]} />
          <meshStandardMaterial color={stripeColor} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Goals3D({ hw, goalWidth = 7.32, goalHeight = 2.44 }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * hw, goalHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[0.12, goalHeight, goalWidth]} />
            <meshStandardMaterial color="white" transparent opacity={0.6} wireframe />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Net3D({ x, hh, height = 1.55, color = "#ddd" }) {
  return (
    <group position={[x, height / 2, 0]}>
      {/* Net posts */}
      <mesh position={[0, 0, -hh - 0.3]}>
        <cylinderGeometry args={[0.05, 0.05, height, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 0, hh + 0.3]}>
        <cylinderGeometry args={[0.05, 0.05, height, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Net mesh */}
      <mesh>
        <boxGeometry args={[0.05, height, hh * 2 + 0.6]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} wireframe />
      </mesh>
      {/* Top cable */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.03, 0.03, hh * 2 + 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

// ── Football (already exists, simplified re-export) ─────────────────────────
export function FootballLines3D({ w = 105, h = 68 }) {
  const points = useMemo(() => {
    const lines = [];
    const hw = w / 2, hh = h / 2;
    const s = w / 105;
    // Outline
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    // Center
    addLine(lines, 0, -hh, 0, hh);
    lines.push(...arcSegments(0, 0, 9.15 * s, 0, 360));
    // Penalty areas
    const penD = 16.5 * s, penW = 20.16 * s, goalD = 5.5 * s, goalW = 9.16 * s;
    for (const side of [-1, 1]) {
      const x = side * hw;
      addLine(lines, x, -penW, x + side * -penD, -penW);
      addLine(lines, x + side * -penD, -penW, x + side * -penD, penW);
      addLine(lines, x + side * -penD, penW, x, penW);
      addLine(lines, x, -goalW, x + side * -goalD, -goalW);
      addLine(lines, x + side * -goalD, -goalW, x + side * -goalD, goalW);
      addLine(lines, x + side * -goalD, goalW, x, goalW);
    }
    return lines;
  }, [w, h]);
  return <Lines points={points} />;
}

// ── Handball (40x20) ────────────────────────────────────────────────────────
export function HandballPitch3D() {
  const w = 40, h = 20, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    addLine(lines, 0, -hh, 0, hh); // center
    lines.push(...arcSegments(0, 0, 4, 0, 360)); // center circle (4m radius approx)
    // 6m goal area arcs
    lines.push(...arcSegments(-hw, 0, 6, -90, 90));
    lines.push(...arcSegments(hw, 0, 6, 90, 270));
    // 9m dashed lines (free throw)
    lines.push(...arcSegments(-hw, 0, 9, -90, 90));
    lines.push(...arcSegments(hw, 0, 9, 90, 270));
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#2a5a8a" stripes={false} />
      <Lines points={points} />
      <Goals3D hw={hw} goalWidth={3} goalHeight={2} />
    </group>
  );
}

// ── Ice Hockey (60x26) ──────────────────────────────────────────────────────
export function HockeyPitch3D() {
  const w = 60, h = 26, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    addLine(lines, 0, -hh, 0, hh); // center red line
    lines.push(...arcSegments(0, 0, 4.5, 0, 360)); // center circle
    // Blue lines
    addLine(lines, -hw + 17.5, -hh, -hw + 17.5, hh);
    addLine(lines, hw - 17.5, -hh, hw - 17.5, hh);
    // Goal creases
    lines.push(...arcSegments(-hw + 4, 0, 1.8, -90, 90));
    lines.push(...arcSegments(hw - 4, 0, 1.8, 90, 270));
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#c8dbe8" stripes={false} />
      <Lines points={points} color="rgba(0,0,0,0.6)" />
      {/* Red center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[0.3, h]} />
        <meshStandardMaterial color="#cc0000" />
      </mesh>
      {/* Blue lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (hw - 17.5), 0.015, 0]}>
          <planeGeometry args={[0.3, h]} />
          <meshStandardMaterial color="#0044aa" />
        </mesh>
      ))}
      <Goals3D hw={hw - 4} goalWidth={1.83} goalHeight={1.22} />
      {/* Boards (rink walls) */}
      {[-1, 1].map((s) => (
        <mesh key={`wall-${s}`} position={[0, 0.5, s * (hh + 0.06)]}>
          <boxGeometry args={[w, 1, 0.12]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`end-${s}`} position={[s * (hw + 0.06), 0.5, 0]}>
          <boxGeometry args={[0.12, 1, h]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ── Basketball (28x15) ──────────────────────────────────────────────────────
export function BasketballPitch3D() {
  const w = 28, h = 15, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    addLine(lines, 0, -hh, 0, hh);
    lines.push(...arcSegments(0, 0, 1.8, 0, 360)); // center circle
    // 3-point arcs
    lines.push(...arcSegments(-hw + 1.575, 0, 6.75, -90, 90));
    lines.push(...arcSegments(hw - 1.575, 0, 6.75, 90, 270));
    // Key/paint areas
    for (const side of [-1, 1]) {
      const x = side * hw;
      const d = 5.8, pw = 2.45;
      addLine(lines, x, -pw, x + side * -d, -pw);
      addLine(lines, x + side * -d, -pw, x + side * -d, pw);
      addLine(lines, x + side * -d, pw, x, pw);
    }
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#c4813a" stripes={false} />
      <Lines points={points} />
      {/* Backboards + hoops */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (hw - 1.2), 0, 0]}>
          <mesh position={[0, 3, 0]}>
            <boxGeometry args={[0.05, 1.05, 1.8]} />
            <meshStandardMaterial color="white" transparent opacity={0.8} />
          </mesh>
          <mesh position={[s * -0.3, 3.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.23, 0.02, 8, 16]} />
            <meshStandardMaterial color="#ff4400" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Futsal (40x20) ──────────────────────────────────────────────────────────
export function FutsalPitch3D() {
  const w = 40, h = 20, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    addLine(lines, 0, -hh, 0, hh);
    lines.push(...arcSegments(0, 0, 3, 0, 360));
    // Penalty areas (6m semicircles)
    lines.push(...arcSegments(-hw, 0, 6, -90, 90));
    lines.push(...arcSegments(hw, 0, 6, 90, 270));
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#2d8a4e" stripes stripeColor="#339956" />
      <Lines points={points} />
      <Goals3D hw={hw} goalWidth={3} goalHeight={2} />
    </group>
  );
}

// ── Floorball (40x20) ───────────────────────────────────────────────────────
export function FloorballPitch3D() {
  const w = 40, h = 20, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    addLine(lines, 0, -hh, 0, hh);
    lines.push(...arcSegments(0, 0, 3, 0, 360));
    // Goal creases (4.5m)
    lines.push(...arcSegments(-hw, 0, 4.5, -90, 90));
    lines.push(...arcSegments(hw, 0, 4.5, 90, 270));
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#4a7a4a" stripes={false} />
      <Lines points={points} />
      <Goals3D hw={hw} goalWidth={1.6} goalHeight={1.15} />
      {/* Rink boards */}
      {[-1, 1].map((s) => (
        <mesh key={`w-${s}`} position={[0, 0.25, s * (hh + 0.06)]}>
          <boxGeometry args={[w, 0.5, 0.1]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e-${s}`} position={[s * (hw + 0.06), 0.25, 0]}>
          <boxGeometry args={[0.1, 0.5, h]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ── Volleyball (18x9) ───────────────────────────────────────────────────────
export function VolleyballPitch3D() {
  const w = 18, h = 9, hw = w / 2, hh = h / 2;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    // Attack lines (3m from center)
    addLine(lines, -3, -hh, -3, hh);
    addLine(lines, 3, -hh, 3, hh);
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w} h={h} color="#c4813a" stripes={false} />
      {/* Two halves in different colors */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-hw / 2, 0.001, 0]}>
        <planeGeometry args={[w / 2, h]} />
        <meshStandardMaterial color="#3a6aaa" transparent opacity={0.4} />
      </mesh>
      <Lines points={points} />
      <Net3D x={0} hh={hh} height={2.43} />
    </group>
  );
}

// ── Padel (20x10) with glass walls and net ──────────────────────────────────
export function PadelPitch3D() {
  const w = 20, h = 10, hw = w / 2, hh = h / 2;
  const svc = 6.95;
  const points = useMemo(() => {
    const lines = [];
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    // Service lines
    addLine(lines, -hw + svc, -hh, -hw + svc, hh);
    addLine(lines, hw - svc, -hh, hw - svc, hh);
    // Center service lines
    addLine(lines, -hw, 0, -hw + svc, 0);
    addLine(lines, hw - svc, 0, hw, 0);
    return lines;
  }, []);

  const wallH = 3; // glass walls are 3m high
  const meshWallH = 1; // mesh/fence above glass on sides

  return (
    <group>
      <Surface w={w} h={h} color="#1a6a9a" stripes={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[hw / 2, 0.001, 0]}>
        <planeGeometry args={[w / 2, h]} />
        <meshStandardMaterial color="#1872a4" transparent opacity={0.3} />
      </mesh>
      <Lines points={points} />

      {/* Net */}
      <Net3D x={0} hh={hh} height={0.92} color="#ddd" />

      {/* Back walls (full glass, 3m high) */}
      {[-1, 1].map((s) => (
        <mesh key={`back-${s}`} position={[s * (hw + 0.06), wallH / 2, 0]}>
          <boxGeometry args={[0.12, wallH, h]} />
          <meshStandardMaterial color="#88ccee" transparent opacity={0.15} />
        </mesh>
      ))}
      {/* Back wall frames */}
      {[-1, 1].map((s) => (
        <group key={`bf-${s}`}>
          <mesh position={[s * (hw + 0.06), wallH / 2, -hh]}>
            <boxGeometry args={[0.08, wallH, 0.08]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[s * (hw + 0.06), wallH / 2, hh]}>
            <boxGeometry args={[0.08, wallH, 0.08]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[s * (hw + 0.06), wallH, 0]}>
            <boxGeometry args={[0.06, 0.06, h]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        </group>
      ))}

      {/* Side walls — lower glass (3m) + mesh fence above (1m) */}
      {[-1, 1].map((s) => (
        <group key={`side-${s}`}>
          {/* Glass portion */}
          <mesh position={[0, wallH / 2, s * (hh + 0.06)]}>
            <boxGeometry args={[w, wallH, 0.12]} />
            <meshStandardMaterial color="#88ccee" transparent opacity={0.12} />
          </mesh>
          {/* Mesh/fence above glass */}
          <mesh position={[0, wallH + meshWallH / 2, s * (hh + 0.06)]}>
            <boxGeometry args={[w, meshWallH, 0.08]} />
            <meshStandardMaterial color="#666" transparent opacity={0.15} wireframe />
          </mesh>
          {/* Corner posts */}
          <mesh position={[-hw, (wallH + meshWallH) / 2, s * (hh + 0.06)]}>
            <boxGeometry args={[0.08, wallH + meshWallH, 0.08]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[hw, (wallH + meshWallH) / 2, s * (hh + 0.06)]}>
            <boxGeometry args={[0.08, wallH + meshWallH, 0.08]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          {/* Top rail */}
          <mesh position={[0, wallH + meshWallH, s * (hh + 0.06)]}>
            <boxGeometry args={[w, 0.06, 0.06]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Tennis (23.77 x 10.97) ──────────────────────────────────────────────────
export function TennisPitch3D() {
  const w = 23.77, h = 10.97, hw = w / 2, hh = h / 2;
  const singlesH = 8.23 / 2; // singles sidelines
  const svcD = 6.4; // service box depth
  const points = useMemo(() => {
    const lines = [];
    // Outer court (doubles)
    addLine(lines, -hw, -hh, hw, -hh); addLine(lines, hw, -hh, hw, hh);
    addLine(lines, hw, hh, -hw, hh); addLine(lines, -hw, hh, -hw, -hh);
    // Singles sidelines
    addLine(lines, -hw, -singlesH, hw, -singlesH);
    addLine(lines, -hw, singlesH, hw, singlesH);
    // Service boxes
    addLine(lines, -svcD, -singlesH, -svcD, singlesH);
    addLine(lines, svcD, -singlesH, svcD, singlesH);
    // Center service line
    addLine(lines, -svcD, 0, svcD, 0);
    // Center marks
    addLine(lines, -hw, -0.15, -hw, 0.15);
    addLine(lines, hw, -0.15, hw, 0.15);
    return lines;
  }, []);
  return (
    <group>
      <Surface w={w + 6} h={h + 4} color="#2a6e3f" stripes={false} />
      {/* Court surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#3068a0" />
      </mesh>
      <Lines points={points} />
      <Net3D x={0} hh={hh + 0.5} height={1.07} />
    </group>
  );
}

// ── Sport pitch dimensions for the ground plane ─────────────────────────────
export const SPORT_DIMS_3D = {
  football:      { w: 105, h: 68 },
  "football-9":  { w: 75, h: 55 },
  "football-7":  { w: 60, h: 40 },
  "football-5":  { w: 40, h: 25 },
  "football-3":  { w: 30, h: 20 },
  handball:      { w: 40, h: 20 },
  hockey:        { w: 60, h: 26 },
  basketball:    { w: 28, h: 15 },
  futsal:        { w: 40, h: 20 },
  floorball:     { w: 40, h: 20 },
  volleyball:    { w: 18, h: 9 },
  padel:         { w: 20, h: 10 },
  tennis:        { w: 23.77, h: 10.97 },
};
