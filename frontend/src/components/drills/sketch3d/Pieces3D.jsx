import { useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
// Using sprite-based labels instead of Text (drei Text requires font loading which can fail)
import * as THREE from "three";

const raycaster = new THREE.Raycaster();

function DraggablePiece({ children, position, onMove, isSelected, onSelect, enabled }) {
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
    onSelect?.();
    setDragging(true);
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
function LowPolyPlayer({ color, skinColor = "#f4c587" }) {
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

      {/* Arms */}
      <mesh position={[-0.52, 1.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.65, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.52, 1.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.65, 0.2]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

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

export function Player3D({ piece, onMove, isSelected, onSelect, enabled }) {
  const color = piece.color || (piece.team === "home" ? "#2563eb" : "#ef4444");
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
    >
      <LowPolyPlayer color={color} />
      {/* Label sprite above head */}
      {piece.label && (
        <sprite position={[0, 3, 0]} scale={[1, 0.5, 1]}>
          <spriteMaterial color="white" transparent opacity={0.85} />
        </sprite>
      )}
    </DraggablePiece>
  );
}

export function Cone3D({ piece, onMove, isSelected, onSelect, enabled }) {
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
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

export function Ball3D({ piece, onMove, isSelected, onSelect, enabled }) {
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
    >
      <mesh position={[0, 0.35, 0]} castShadow>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color="white" flatShading />
      </mesh>
      {/* Dark panels */}
      <mesh position={[0, 0.35, 0]}>
        <icosahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#333" wireframe transparent opacity={0.4} />
      </mesh>
    </DraggablePiece>
  );
}

export function Arrow3D({ arrow }) {
  const color = arrow.color || "#ffffff";
  const dashed = arrow.style === "dashed" || arrow.style === "pass";

  const dx = arrow.toX - arrow.fromX;
  const dz = arrow.toZ - arrow.fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;
  const angle = Math.atan2(dx, dz);

  // Arrow shaft as a thin box
  const midX = (arrow.fromX + arrow.toX) / 2;
  const midZ = (arrow.fromZ + arrow.toZ) / 2;

  return (
    <group>
      {/* Shaft */}
      <mesh position={[midX, 0.15, midZ]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.15, 0.1, len - 0.8]} />
        <meshStandardMaterial color={color} transparent={dashed} opacity={dashed ? 0.5 : 0.9} />
      </mesh>
      {/* Arrowhead */}
      <mesh position={[arrow.toX, 0.2, arrow.toZ]} rotation={[-Math.PI / 2, 0, -angle + Math.PI]}>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
