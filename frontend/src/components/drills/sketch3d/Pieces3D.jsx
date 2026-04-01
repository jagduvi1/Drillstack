import { useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
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
          <ringGeometry args={[1.8, 2.2, 32]} />
          <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
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
      {/* Body cylinder */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 2, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      {/* Label */}
      {piece.label && (
        <Text position={[0, 3.2, 0]} fontSize={0.8} color="white"
          anchorX="center" anchorY="middle" outlineWidth={0.08} outlineColor="black">
          {piece.label}
        </Text>
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
    </DraggablePiece>
  );
}

export function Ball3D({ piece, onMove, isSelected, onSelect, enabled }) {
  return (
    <DraggablePiece
      position={[piece.x, 0, piece.z]}
      onMove={onMove} isSelected={isSelected} onSelect={onSelect} enabled={enabled}
    >
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Dark pentagons pattern (simplified) */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.42, 8, 8]} />
        <meshStandardMaterial color="#333" wireframe transparent opacity={0.3} />
      </mesh>
    </DraggablePiece>
  );
}

export function Arrow3D({ arrow }) {
  const points = [
    new THREE.Vector3(arrow.fromX, 0.3, arrow.fromZ),
    new THREE.Vector3(arrow.toX, 0.3, arrow.toZ),
  ];
  const color = arrow.color || "#ffffff";
  const dashed = arrow.style === "dashed" || arrow.style === "pass";

  // Arrowhead
  const dx = arrow.toX - arrow.fromX;
  const dz = arrow.toZ - arrow.fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;
  const angle = Math.atan2(dx, dz);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([points[0].x, points[0].y, points[0].z, points[1].x, points[1].y, points[1].z])}
            itemSize={3}
          />
        </bufferGeometry>
        {dashed
          ? <lineDashedMaterial color={color} dashSize={1} gapSize={0.5} />
          : <lineBasicMaterial color={color} linewidth={2} />
        }
      </line>
      {/* Arrowhead cone */}
      <mesh position={[arrow.toX, 0.3, arrow.toZ]} rotation={[0, angle, 0]}>
        <coneGeometry args={[0.4, 1, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
