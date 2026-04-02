import { useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
// Using sprite-based labels instead of Text (drei Text requires font loading which can fail)
import * as THREE from "three";

const raycaster = new THREE.Raycaster();

function DraggablePiece({ children, position, onMove, isSelected, onSelect, enabled, onDragStart, onDragEnd, onContextMenu }) {
  const ref = useRef();
  const { camera, gl, scene } = useThree();
  const [dragging, setDragging] = useState(false);

  const getGroundPoint = (e) => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const ground = scene.getObjectByName("groundPlane");
    if (!ground) return null;
    const hits = raycaster.intersectObject(ground);
    return hits.length > 0 ? hits[0].point : null;
  };

  const handlePointerDown = (e) => {
    if (!enabled) return;
    e.stopPropagation();
    // Right-click → context menu instead of drag
    if (e.button === 2 && onContextMenu) {
      onContextMenu(e);
      return;
    }
    onSelect?.();
    setDragging(true);
    onDragStart?.();
    gl.domElement.style.cursor = "grabbing";
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const pt = getGroundPoint(e);
    if (pt) onMove?.(pt.x, pt.z);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    onDragEnd?.();
    gl.domElement.style.cursor = "auto";
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <group
      ref={ref}
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => { if (onContextMenu) { e.stopPropagation(); onContextMenu(e); } }}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.4, 1.7, 32]} />
          <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );
}

// ── Low-poly humanoid player ────────────────────────────────────────────────
function LowPolyPlayer({ color, skinColor = "#f4c587", sport }) {
  const isHandball = sport === "handball";
  return (
    <group>
      {/* Feet / shoes */}
      <mesh position={[-0.22, 0.1, 0]} castShadow>
        <boxGeometry args={[0.22, 0.2, 0.35]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.22, 0.1, 0]} castShadow>
        <boxGeometry args={[0.22, 0.2, 0.35]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Legs (shorts) */}
      <mesh position={[-0.22, 0.55, 0]} castShadow>
        <boxGeometry args={[0.28, 0.7, 0.28]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.22, 0.55, 0]} castShadow>
        <boxGeometry args={[0.28, 0.7, 0.28]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Shorts */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.75, 0.35, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Torso / jersey */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left arm — always at side */}
      <mesh position={[-0.52, 1.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.65, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Right arm — raised for handball (throwing stance) */}
      <group position={[0.52, 1.6, 0]} rotation={isHandball ? [-0.5, 0, 0] : [0, 0, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.65, 0.2]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.4]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 2.42, 0]}>
        <boxGeometry args={[0.42, 0.12, 0.42]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
    </group>
  );
}

export function Player3D({ piece, onMove, isSelected, onSelect, enabled, onDragStart, onDragEnd, sport }) {
  const color = piece.color || (piece.team === "home" ? "#2563eb" : "#ef4444");
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
      onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <LowPolyPlayer color={color} sport={sport} />
      {/* Label sprite above head */}
      {piece.label && (
        <sprite position={[0, 3, 0]} scale={[1, 0.5, 1]}>
          <spriteMaterial color="white" transparent opacity={0.85} />
        </sprite>
      )}
    </DraggablePiece>
  );
}

export function Cone3D({ piece, onMove, isSelected, onSelect, enabled, onDragStart, onDragEnd }) {
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
      onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <coneGeometry args={[0.5, 1, 16]} />
        <meshStandardMaterial color="#ff8c00" />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshStandardMaterial color="#ff6600" />
      </mesh>
    </DraggablePiece>
  );
}

const HANDBALL_BALL_Y = 1.5; // hand height
const GROUND_BALL_Y = 0.35;
const HANDBALL_HOLD_DIST = 1.5; // max distance to "hold" ball

export function Ball3D({ piece, onMove, isSelected, onSelect, enabled, onDragStart, onDragEnd, sport, allPieces, onContextMenu }) {
  const isHandball = sport === "handball";
  const animationDriven = piece.ballY != null;

  // For handball (static/edit mode): check if a player is close enough to "hold" the ball
  // During animation, ballY is set by the interpolation logic — skip proximity check
  let ballY = GROUND_BALL_Y;
  let offsetX = 0;
  if (isHandball && !animationDriven && allPieces) {
    const players = allPieces.filter((p) => p.type === "player");
    let minDist = Infinity;
    for (const pl of players) {
      const dx = pl.x - piece.x, dz = pl.z - piece.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) minDist = dist;
    }
    if (minDist < HANDBALL_HOLD_DIST) {
      ballY = HANDBALL_BALL_Y;
      offsetX = 0.6; // offset to the right (throwing hand)
    }
  }

  const finalY = animationDriven ? piece.ballY : ballY;

  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onContextMenu={onContextMenu}
    >
      <mesh position={[offsetX, finalY, 0]} castShadow>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="white" flatShading />
      </mesh>
      {/* Dark panels */}
      <mesh position={[offsetX, finalY, 0]}>
        <icosahedronGeometry args={[0.29, 0]} />
        <meshStandardMaterial color="#333" wireframe transparent opacity={0.4} />
      </mesh>
    </DraggablePiece>
  );
}

// ── Pass path visualization ─────────────────────────────────────────────────
const PASS_COLORS = { air: "#60a5fa", bounce: "#fbbf24", ground: "#a3a3a3" };

export function Pass3D({ pass, isSelected, onSelect }) {
  const color = PASS_COLORS[pass.type] || "#ffffff";
  const isBounce = pass.type === "bounce";

  if (isBounce && pass.bounceX != null) {
    // Two-segment path: from → bounce → to
    const mid1X = (pass.fromX + pass.bounceX) / 2;
    const mid1Z = (pass.fromZ + pass.bounceZ) / 2;
    const dx1 = pass.bounceX - pass.fromX, dz1 = pass.bounceZ - pass.fromZ;
    const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
    const angle1 = Math.atan2(dx1, dz1);

    const mid2X = (pass.bounceX + pass.toX) / 2;
    const mid2Z = (pass.bounceZ + pass.toZ) / 2;
    const dx2 = pass.toX - pass.bounceX, dz2 = pass.toZ - pass.bounceZ;
    const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
    const angle2 = Math.atan2(dx2, dz2);

    return (
      <group onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
        {isSelected && (
          <mesh position={[pass.bounceX, 0.02, pass.bounceZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.1, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* Segment 1: from → bounce */}
        {len1 > 0.5 && (
          <mesh position={[mid1X, 0.12, mid1Z]} rotation={[0, angle1, 0]}>
            <boxGeometry args={[0.12, 0.06, Math.max(0.1, len1 - 0.5)]} />
            <meshStandardMaterial color={color} transparent opacity={0.6} />
          </mesh>
        )}
        {/* Bounce point marker */}
        <mesh position={[pass.bounceX, 0.15, pass.bounceZ]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        {/* Down arrow at bounce point */}
        <mesh position={[pass.bounceX, 0.55, pass.bounceZ]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.2, 0.4, 6]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        {/* Segment 2: bounce → to */}
        {len2 > 0.5 && (
          <mesh position={[mid2X, 0.12, mid2Z]} rotation={[0, angle2, 0]}>
            <boxGeometry args={[0.12, 0.06, Math.max(0.1, len2 - 0.5)]} />
            <meshStandardMaterial color={color} transparent opacity={0.6} />
          </mesh>
        )}
        {/* Target marker */}
        <mesh position={[pass.toX, 0.2, pass.toZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.5, 16]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // Air / ground pass: single segment from → to
  const dx = pass.toX - pass.fromX, dz = pass.toZ - pass.fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;
  const angle = Math.atan2(dx, dz);
  const midX = (pass.fromX + pass.toX) / 2;
  const midZ = (pass.fromZ + pass.toZ) / 2;
  const isAir = pass.type === "air";

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {isSelected && (
        <mesh position={[midX, 0.02, midZ]} rotation={[-Math.PI / 2, 0, angle]}>
          <planeGeometry args={[0.6, len]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[midX, isAir ? 0.18 : 0.08, midZ]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.12, 0.06, Math.max(0.1, len - 0.5)]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Target marker */}
      <mesh position={[pass.toX, 0.2, pass.toZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Arrow3D({ arrow, onSelect, isSelected }) {
  const color = arrow.color || "#ffffff";
  const isBounce = arrow.style === "bounce";
  const dashed = arrow.style === "dashed" || arrow.style === "pass" || isBounce;

  const dx = arrow.toX - arrow.fromX;
  const dz = arrow.toZ - arrow.fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;
  const angle = Math.atan2(dx, dz);

  const midX = (arrow.fromX + arrow.toX) / 2;
  const midZ = (arrow.fromZ + arrow.toZ) / 2;

  const arrowColor = isBounce ? "#fbbf24" : color;

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {/* Selection highlight */}
      {isSelected && (
        <mesh position={[midX, 0.02, midZ]} rotation={[-Math.PI / 2, 0, angle]}>
          <planeGeometry args={[0.6, len]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Shaft */}
      <mesh position={[midX, 0.15, midZ]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.15, 0.1, len - 0.8]} />
        <meshStandardMaterial color={arrowColor} transparent={dashed} opacity={dashed ? 0.5 : 0.9} />
      </mesh>
      {/* Bounce indicator — small sphere at ground level */}
      {isBounce && (
        <mesh position={[midX, 0.05, midZ]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Arrowhead */}
      <mesh position={[arrow.toX, 0.2, arrow.toZ]} rotation={[-Math.PI / 2, 0, -angle + Math.PI]}>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color={arrowColor} />
      </mesh>
    </group>
  );
}
