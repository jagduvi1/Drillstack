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
} from "react-icons/fi";
import { BLOCK_DEFAULTS, BLOCK_ICONS, getLocalizedBlockLabels, blockDuration } from "../../constants/blockTypes";

export default function BlockList({ blocks, onChange, onPickDrill, onPreviewDrill }) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const blockLabels = getLocalizedBlockLabels(t);

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
