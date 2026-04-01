import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import Pitch3D, { PITCH_W, PITCH_H } from "./Pitch3D";
import { Player3D, Cone3D, Ball3D, Arrow3D } from "./Pieces3D";
import { FiPlus, FiTrash2, FiCircle, FiTriangle, FiMousePointer, FiArrowRight } from "react-icons/fi";
import * as THREE from "three";
import "../../../styles/sketch3d.css";

const TOOLS = ["select", "arrow"];

export default function DrillSketchEditor({ sketch, onChange, readOnly = false, fullHeight = false }) {
  const { t } = useTranslation();
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  const [arrowStart, setArrowStart] = useState(null);
  const controlsRef = useRef();

  const pieces = sketch?.pieces || [];
  const arrows = sketch?.arrows || [];

  const update = useCallback((newPieces, newArrows) => {
    onChange?.({
      ...sketch,
      pieces: newPieces ?? pieces,
      arrows: newArrows ?? arrows,
    });
  }, [sketch, pieces, arrows, onChange]);

  const movePiece = useCallback((id, x, z) => {
    // Clamp to pitch bounds
    const hw = PITCH_W / 2 + 5, hh = PITCH_H / 2 + 5;
    const cx = Math.max(-hw, Math.min(hw, x));
    const cz = Math.max(-hh, Math.min(hh, z));
    update(pieces.map((p) => p.id === id ? { ...p, x: cx, z: cz } : p));
  }, [pieces, update]);

  const addPiece = (type, team) => {
    const id = `${type}-${Date.now()}`;
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 15;
    const color = type === "player"
      ? (team === "home" ? "#2563eb" : "#ef4444")
      : undefined;
    const count = pieces.filter((p) => p.type === type && p.team === team).length;
    const label = type === "player" ? String(count + 1) : "";
    update([...pieces, { id, type, team: team || "neutral", label, x, z, color }]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    update(
      pieces.filter((p) => p.id !== selectedId),
      arrows.filter((a) => a.id !== selectedId)
    );
    setSelectedId(null);
  };

  // Handle clicking on empty ground for arrow drawing
  const handleCanvasClick = useCallback((e) => {
    if (tool !== "arrow" || readOnly) return;
    // Get ground intersection
    const canvas = e.target;
    if (!canvas?.getBoundingClientRect) return;
  }, [tool, readOnly]);

  const handleGroundClick = useCallback((e) => {
    if (readOnly) return;
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    if (tool === "arrow") {
      e.stopPropagation();
      const pt = e.point;
      if (!arrowStart) {
        setArrowStart({ x: pt.x, z: pt.z });
        if (controlsRef.current) controlsRef.current.enabled = false;
      } else {
        const dx = pt.x - arrowStart.x, dz = pt.z - arrowStart.z;
        if (Math.sqrt(dx * dx + dz * dz) > 1) {
          const newArrow = {
            id: `arrow-${Date.now()}`,
            fromX: arrowStart.x, fromZ: arrowStart.z,
            toX: pt.x, toZ: pt.z,
            color: "#ffffff", style: "solid",
          };
          update(pieces, [...arrows, newArrow]);
        }
        setArrowStart(null);
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  }, [tool, arrowStart, pieces, arrows, update, readOnly]);

  return (
    <div className="drill-sketch-editor" style={fullHeight ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="sketch-toolbar">
          <button className={`btn btn-sm ${tool === "select" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setTool("select"); setArrowStart(null); }} title={t("sketch.select")}>
            <FiMousePointer />
          </button>
          <button className={`btn btn-sm ${tool === "arrow" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTool("arrow")} title={t("sketch.arrow")}>
            <FiArrowRight />
          </button>
          <span className="sketch-toolbar-divider" />
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("player", "home")}
            title={t("sketch.addHomePlayer")} style={{ borderLeft: "3px solid #2563eb" }}>
            <FiPlus /> {t("sketch.home")}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("player", "away")}
            title={t("sketch.addAwayPlayer")} style={{ borderLeft: "3px solid #ef4444" }}>
            <FiPlus /> {t("sketch.away")}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("ball", "neutral")} title={t("sketch.addBall")}>
            <FiCircle />
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => addPiece("cone", "neutral")} title={t("sketch.addCone")}>
            <FiTriangle />
          </button>
          {selectedId && (
            <>
              <span className="sketch-toolbar-divider" />
              <button className="btn btn-sm btn-danger" onClick={deleteSelected}>
                <FiTrash2 /> {t("common.delete")}
              </button>
            </>
          )}
          {arrowStart && (
            <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
              {t("sketch.clickEndpoint")}
            </span>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <div className="sketch-canvas-wrapper" style={fullHeight ? { height: "100%" } : undefined}>
        <Canvas
          shadows
          camera={{ position: [0, 60, 50], fov: 45 }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[30, 50, 20]} intensity={1} castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024}
            shadow-camera-far={150} shadow-camera-left={-60} shadow-camera-right={60}
            shadow-camera-top={40} shadow-camera-bottom={-40} />

          <Pitch3D />

          {/* Ground click target */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, 0]}
            visible={false}
            onClick={handleGroundClick}
            name="groundPlane"
          >
            <planeGeometry args={[PITCH_W + 20, PITCH_H + 20]} />
            <meshBasicMaterial />
          </mesh>

          {/* Arrows */}
          {arrows.map((a) => <Arrow3D key={a.id} arrow={a} />)}

          {/* Pieces */}
          {pieces.map((p) => {
            const props = {
              key: p.id,
              piece: p,
              onMove: (x, z) => movePiece(p.id, x, z),
              isSelected: selectedId === p.id,
              onSelect: () => !readOnly && setSelectedId(p.id),
              enabled: !readOnly && tool === "select",
            };
            if (p.type === "cone") return <Cone3D {...props} />;
            if (p.type === "ball") return <Ball3D {...props} />;
            return <Player3D {...props} />;
          })}

          <OrbitControls
            ref={controlsRef}
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2.1}
            minDistance={15}
            maxDistance={120}
            target={[0, 0, 0]}
          />

          <Environment preset="sunset" />
        </Canvas>
      </div>
    </div>
  );
}
