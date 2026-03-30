import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiPlay, FiPause, FiSkipForward, FiRotateCcw, FiChevronRight } from "react-icons/fi";
import { BLOCK_ICONS, blockDuration } from "../../constants/blockTypes";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionTimer({ blocks, onBlockChange }) {
  const { t } = useTranslation();
  const [currentBlock, setCurrentBlock] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const block = blocks[currentBlock];
  const totalSeconds = (blockDuration(block) || 0) * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const isOvertime = elapsed > totalSeconds && totalSeconds > 0;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const goToBlock = useCallback((idx) => {
    setCurrentBlock(idx);
    setElapsed(0);
    setRunning(false);
    onBlockChange?.(idx);
  }, [onBlockChange]);

  const nextBlock = useCallback(() => {
    if (currentBlock < blocks.length - 1) goToBlock(currentBlock + 1);
  }, [currentBlock, blocks.length, goToBlock]);

  const reset = () => { setElapsed(0); setRunning(false); };

  // Auto-notify when block time is up
  useEffect(() => {
    if (remaining === 0 && totalSeconds > 0 && running && !isOvertime) {
      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [remaining, totalSeconds, running, isOvertime]);

  if (!block) return null;

  return (
    <div className="session-timer">
      {/* Block indicator */}
      <div className="timer-blocks">
        {blocks.map((b, i) => (
          <button
            key={i}
            className={`timer-block-dot ${i === currentBlock ? "active" : ""} ${i < currentBlock ? "done" : ""}`}
            onClick={() => goToBlock(i)}
            title={b.label || b.type}
          >
            {BLOCK_ICONS[b.type] || (i + 1)}
          </button>
        ))}
      </div>

      {/* Current block info */}
      <div className="timer-block-name">
        {BLOCK_ICONS[block.type]} {block.label || t(`blocks.${block.type}`)}
        <span className="text-muted" style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>
          {currentBlock + 1}/{blocks.length}
        </span>
      </div>

      {/* Big timer display */}
      <div className={`timer-display ${isOvertime ? "timer-overtime" : ""}`}>
        {totalSeconds > 0 ? (
          <>
            <span className="timer-time">{formatTime(remaining)}</span>
            <div className="timer-progress-bar">
              <div className="timer-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            {isOvertime && (
              <span className="timer-overtime-label">+{formatTime(elapsed - totalSeconds)}</span>
            )}
          </>
        ) : (
          <span className="timer-time timer-stopwatch">{formatTime(elapsed)}</span>
        )}
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button className="timer-btn" onClick={reset} title={t("calendar.reset")}>
          <FiRotateCcw />
        </button>
        <button className={`timer-btn timer-btn-main ${running ? "timer-btn-pause" : ""}`} onClick={() => setRunning(!running)}>
          {running ? <FiPause /> : <FiPlay />}
        </button>
        <button className="timer-btn" onClick={nextBlock} disabled={currentBlock >= blocks.length - 1} title={t("calendar.nextBlock")}>
          <FiSkipForward />
        </button>
      </div>
    </div>
  );
}
