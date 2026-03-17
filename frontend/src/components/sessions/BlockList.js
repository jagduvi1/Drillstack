import { useState } from "react";
import { useTranslation } from "react-i18next";
import DrillBlock from "./DrillBlock";
import StationBlock from "./StationBlock";
import MatchplayBlock from "./MatchplayBlock";
import BreakBlock from "./BreakBlock";
import CustomBlock from "./CustomBlock";
import {
  FiChevronUp,
  FiChevronDown,
  FiTrash2,
  FiPlus,
  FiZap,
  FiGrid,
  FiPlay,
  FiCoffee,
  FiFileText,
} from "react-icons/fi";

const BLOCK_DEFAULTS = {
  drills: { label: "Drill Sequence", drills: [], notes: "" },
  stations: {
    label: "Station Rotation",
    stationCount: 4,
    rotationMinutes: 5,
    stations: [
      { stationNumber: 1, drill: null, notes: "" },
      { stationNumber: 2, drill: null, notes: "" },
      { stationNumber: 3, drill: null, notes: "" },
      { stationNumber: 4, drill: null, notes: "" },
    ],
    notes: "",
  },
  matchplay: { label: "Match Play", duration: 15, matchDescription: "", rules: "", notes: "" },
  break: { label: "Break", duration: 3, notes: "" },
  custom: { label: "Custom", duration: 5, customContent: "", notes: "" },
};

const BLOCK_ICONS = {
  drills: <FiZap />,
  stations: <FiGrid />,
  matchplay: <FiPlay />,
  break: <FiCoffee />,
  custom: <FiFileText />,
};

const BLOCK_LABELS = {
  drills: "Drill Sequence",
  stations: "Station Rotation",
  matchplay: "Match Play",
  break: "Break",
  custom: "Custom",
};

export default function BlockList({ blocks, onChange, onPickDrill, onPreviewDrill }) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const blockLabels = {
    drills: t("blocks.drillSequence"),
    stations: t("blocks.stationRotation"),
    matchplay: t("blocks.matchPlay"),
    break: t("blocks.break"),
    custom: t("blocks.custom"),
  };

  const updateBlock = (idx, updatedBlock) => {
    const updated = [...blocks];
    updated[idx] = updatedBlock;
    onChange(updated);
  };

  const removeBlock = (idx) => {
    onChange(blocks.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    // Update order fields
    updated.forEach((b, i) => (b.order = i));
    onChange(updated);
  };

  const addBlock = (type) => {
    const newBlock = {
      type,
      ...BLOCK_DEFAULTS[type],
      order: blocks.length,
    };
    onChange([...blocks, newBlock]);
    setShowMenu(false);
  };

  const blockDuration = (block) => {
    switch (block.type) {
      case "drills":
        return block.drills.reduce((s, d) => s + (d.duration || 0), 0);
      case "stations":
        return (block.stationCount || 0) * (block.rotationMinutes || 0);
      default:
        return block.duration || 0;
    }
  };

  return (
    <div>
      {blocks.map((block, idx) => (
        <div key={idx} className={`card mb-1 block-card block-card-${block.type}`}>
          <div className="block-header">
            <div className="flex gap-sm" style={{ alignItems: "center" }}>
              <span style={{ color: "var(--color-muted)" }}>{BLOCK_ICONS[block.type]}</span>
              <input
                className="block-label-input"
                value={block.label}
                onChange={(e) => updateBlock(idx, { ...block, label: e.target.value })}
                placeholder={blockLabels[block.type]}
              />
              <span className="tag">{blockDuration(block)} min</span>
            </div>
            <div className="block-controls">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => moveBlock(idx, -1)}
                disabled={idx === 0}
                title={t("blocks.moveUp")}
              >
                <FiChevronUp />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => moveBlock(idx, 1)}
                disabled={idx === blocks.length - 1}
                title={t("blocks.moveDown")}
              >
                <FiChevronDown />
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => removeBlock(idx)}
                title={t("blocks.removeBlock")}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>

          {block.type === "drills" && (
            <DrillBlock
              block={block}
              onChange={(b) => updateBlock(idx, b)}
              onPickDrill={() => onPickDrill(idx, "drills")}
              onPreviewDrill={onPreviewDrill}
            />
          )}
          {block.type === "stations" && (
            <StationBlock
              block={block}
              onChange={(b) => updateBlock(idx, b)}
              onPickDrillForStation={(stationIdx) =>
                onPickDrill(idx, "stations", stationIdx)
              }
              onPreviewDrill={onPreviewDrill}
            />
          )}
          {block.type === "matchplay" && (
            <MatchplayBlock block={block} onChange={(b) => updateBlock(idx, b)} />
          )}
          {block.type === "break" && (
            <BreakBlock block={block} onChange={(b) => updateBlock(idx, b)} />
          )}
          {block.type === "custom" && (
            <CustomBlock block={block} onChange={(b) => updateBlock(idx, b)} />
          )}
        </div>
      ))}

      <div className="add-block-menu">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowMenu(!showMenu)}
        >
          <FiPlus /> {t("blocks.addBlock")}
        </button>
        {showMenu && (
          <div className="add-block-options">
            {Object.entries(blockLabels).map(([type, label]) => (
              <button
                key={type}
                className="add-block-option"
                onClick={() => addBlock(type)}
              >
                {BLOCK_ICONS[type]} {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
