import { useMemo } from "react";
import * as THREE from "three";

// Standard pitch: 105m x 68m, centered at origin, lying on XZ plane (Y is up)
const W = 105;
const H = 68;

function FieldLines() {
  const points = useMemo(() => {
    const lines = [];
    const hw = W / 2, hh = H / 2;

    const addLine = (x1, z1, x2, z2) => {
      lines.push(new THREE.Vector3(x1, 0.02, z1));
      lines.push(new THREE.Vector3(x2, 0.02, z2));
    };

    // Outline
    addLine(-hw, -hh, hw, -hh);
    addLine(hw, -hh, hw, hh);
    addLine(hw, hh, -hw, hh);
    addLine(-hw, hh, -hw, -hh);

    // Center line
    addLine(0, -hh, 0, hh);

    // Center circle (approximation with segments)
    const r = 9.15;
    for (let i = 0; i < 32; i++) {
      const a1 = (i / 32) * Math.PI * 2;
      const a2 = ((i + 1) / 32) * Math.PI * 2;
      addLine(Math.cos(a1) * r, Math.sin(a1) * r, Math.cos(a2) * r, Math.sin(a2) * r);
    }

    // Center dot
    addLine(-0.3, 0, 0.3, 0);
    addLine(0, -0.3, 0, 0.3);

    // Penalty areas (both ends)
    const penD = 16.5, penW = 40.32 / 2;
    // Left
    addLine(-hw, -penW, -hw + penD, -penW);
    addLine(-hw + penD, -penW, -hw + penD, penW);
    addLine(-hw + penD, penW, -hw, penW);
    // Right
    addLine(hw, -penW, hw - penD, -penW);
    addLine(hw - penD, -penW, hw - penD, penW);
    addLine(hw - penD, penW, hw, penW);

    // Goal areas
    const goalD = 5.5, goalW = 18.32 / 2;
    addLine(-hw, -goalW, -hw + goalD, -goalW);
    addLine(-hw + goalD, -goalW, -hw + goalD, goalW);
    addLine(-hw + goalD, goalW, -hw, goalW);
    addLine(hw, -goalW, hw - goalD, -goalW);
    addLine(hw - goalD, -goalW, hw - goalD, goalW);
    addLine(hw - goalD, goalW, hw, goalW);

    return lines;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="white" transparent opacity={0.8} />
    </lineSegments>
  );
}

export default function Pitch3D() {
  const hw = W / 2, hh = H / 2;

  return (
    <group>
      {/* Grass surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#2d8a4e" />
      </mesh>

      {/* Grass stripes (alternating) */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-hw + (i * 2 + 1) * (W / 20), 0.001, 0]}>
          <planeGeometry args={[W / 10, H]} />
          <meshStandardMaterial color="#339956" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Field lines */}
      <FieldLines />

      {/* Goals (simple wireframe boxes) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * hw, 1.22, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 2.44, 7.32]} />
            <meshStandardMaterial color="white" transparent opacity={0.6} wireframe />
          </mesh>
        </group>
      ))}

      {/* ── Advertisement boards ─────────────────────────────────────── */}
      {/* Side boards (along the long edges) */}
      {[-1, 1].map((side) => (
        <group key={`side-${side}`} position={[0, 0, side * (hh + 0.8)]}>
          {/* Board backing */}
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[W - 4, 1.2, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Ad panel - Cellarion */}
          <mesh position={[0, 0.6, side * 0.08]}>
            <planeGeometry args={[W - 4.5, 1]} />
            <meshStandardMaterial color="#6366f1" />
          </mesh>
          {/* Ad text strip */}
          <mesh position={[0, 0.6, side * 0.09]}>
            <planeGeometry args={[24, 0.4]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {/* Cellarion.app repeated sections */}
          {[-30, -10, 10, 30].map((xOff, i) => (
            <mesh key={i} position={[xOff, 0.6, side * 0.09]}>
              <planeGeometry args={[18, 0.35]} />
              <meshStandardMaterial color="#4f46e5" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Behind-goal boards */}
      {[-1, 1].map((side) => (
        <group key={`goal-${side}`} position={[side * (hw + 1.5), 0, 0]}>
          <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[H - 4, 1.2, 0.15]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Ad panel */}
          <mesh position={[side * 0.08, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[H - 4.5, 1]} />
            <meshStandardMaterial color="#6366f1" />
          </mesh>
          {/* White text strip */}
          <mesh position={[side * 0.09, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[20, 0.35]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      ))}

      {/* Ground plane for shadows and raycasting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} visible={false} name="groundPlane">
        <planeGeometry args={[W + 20, H + 20]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export { W as PITCH_W, H as PITCH_H };
