import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import api from "../../../api/client";

// Create a canvas texture with text — reliable alternative to drei Text
function useTextTexture(text, bgColor, textColor, width = 512, height = 128) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.floor(height * 0.55)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, bgColor, textColor, width, height]);
  return texture;
}

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

// ── LED-style ad board segment with readable text ───────────────────────────
function AdPanel({ position, rotation, width, bgColor, textColor, text }) {
  const boardH = 0.9;
  const tilt = 0.15;
  const texture = useTextTexture(text, bgColor, textColor || "#ffffff", 512, 128);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <group rotation={[-tilt, 0, 0]}>
        {/* Board frame */}
        <mesh position={[0, boardH / 2 + 0.05, 0]}>
          <boxGeometry args={[width, boardH + 0.1, 0.12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {/* LED panel face with text texture */}
        <mesh position={[0, boardH / 2 + 0.05, 0.07]}>
          <planeGeometry args={[width - 0.2, boardH - 0.1]} />
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveIntensity={0.15} />
        </mesh>
        {/* Support legs */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (width / 2 - 0.4), -0.02, -0.06]}>
            <boxGeometry args={[0.1, 0.15, 0.22]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const DEFAULT_SIDE_ADS = [
  { text: "Cellarion.app", bgColor: "#6366f1", textColor: "#ffffff" },
  { text: "DrillStack", bgColor: "#0ea5e9", textColor: "#ffffff" },
  { text: "Cellarion.app", bgColor: "#6366f1", textColor: "#e0e7ff" },
  { text: "DrillStack", bgColor: "#dc2626", textColor: "#ffffff" },
  { text: "Cellarion.app", bgColor: "#16a34a", textColor: "#ffffff" },
  { text: "Your Wine Cellar", bgColor: "#6366f1", textColor: "#ffffff" },
  { text: "DrillStack", bgColor: "#f59e0b", textColor: "#1a1a2e" },
];

const DEFAULT_GOAL_ADS = [
  { text: "Cellarion.app", bgColor: "#6366f1", textColor: "#ffffff" },
  { text: "DrillStack", bgColor: "#f59e0b", textColor: "#1a1a2e" },
  { text: "Cellarion.app", bgColor: "#6366f1", textColor: "#e0e7ff" },
  { text: "DrillStack", bgColor: "#0ea5e9", textColor: "#ffffff" },
];

function AdBoards({ hw, hh }) {
  const [customAds, setCustomAds] = useState(null);

  useEffect(() => {
    api.get("/ad-boards")
      .then((res) => { if (res.data?.length > 0) setCustomAds(res.data); })
      .catch(() => {});
  }, []);

  // Build side and goal ads from custom config or defaults
  const sideAdDefs = customAds
    ? customAds.filter((a) => a.position === "side" || !a.position)
    : DEFAULT_SIDE_ADS;
  const goalAdDefs = customAds
    ? customAds.filter((a) => a.position === "goal")
    : DEFAULT_GOAL_ADS;

  // Distribute side ads evenly along the pitch
  const sideSpacing = (W - 4) / Math.max(sideAdDefs.length, 1);
  const sideAds = sideAdDefs.map((ad, i) => ({
    x: -hw + 2 + sideSpacing * (i + 0.5),
    w: Math.min(sideSpacing - 1, 18),
    ...ad,
  }));

  // Distribute goal ads evenly
  const goalSpacing = (H - 4) / Math.max(goalAdDefs.length, 1);
  const goalAds = goalAdDefs.map((ad, i) => ({
    z: -hh + 2 + goalSpacing * (i + 0.5),
    w: Math.min(goalSpacing - 1, 16),
    ...ad,
  }));

  return (
    <group>
      {/* Side boards — both long edges */}
      {[-1, 1].map((side) =>
        sideAds.map((ad, i) => (
          <AdPanel
            key={`side-${side}-${i}`}
            position={[ad.x, 0, side * (hh + 1.2)]}
            rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            width={ad.w}
            bgColor={ad.bgColor}
            textColor={ad.textColor}
            text={ad.text}
          />
        ))
      )}

      {/* Behind-goal boards — both ends */}
      {[-1, 1].map((side) =>
        goalAds.map((ad, i) => (
          <AdPanel
            key={`goal-${side}-${i}`}
            position={[side * (hw + 2), 0, ad.z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            width={ad.w}
            bgColor={ad.bgColor}
            textColor={ad.textColor}
            text={ad.text}
          />
        ))
      )}
    </group>
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

      {/* ── LED advertisement boards (realistic low boards) ──────────── */}
      <AdBoards hw={hw} hh={hh} />

      {/* Ground plane for shadows and raycasting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} visible={false} name="groundPlane">
        <planeGeometry args={[W + 20, H + 20]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export { W as PITCH_W, H as PITCH_H };
