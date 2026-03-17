import { useState } from "react";
import { FiCode, FiChevronDown, FiChevronRight } from "react-icons/fi";

function DebugEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="debug-entry">
      <button
        type="button"
        className="debug-entry-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex gap-sm" style={{ alignItems: "center" }}>
          {expanded ? <FiChevronDown /> : <FiChevronRight />}
          <strong className="text-sm">{entry.label}</strong>
        </span>
        <span className="text-sm text-muted">
          {entry.debug?.provider}/{entry.debug?.model} &middot;{" "}
          {entry.debug?.durationMs}ms
        </span>
      </button>
      {expanded && (
        <div className="debug-entry-body">
          <div className="debug-section">
            <div className="debug-section-label">System Prompt</div>
            <pre className="debug-pre">{entry.debug?.systemPrompt}</pre>
          </div>
          <div className="debug-section">
            <div className="debug-section-label">User Prompt</div>
            <pre className="debug-pre">{entry.debug?.userPrompt}</pre>
          </div>
          <div className="debug-section">
            <div className="debug-section-label">Raw Response</div>
            <pre className="debug-pre">{entry.debug?.rawResponse}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DebugPanel({ entries }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="debug-panel mb-1">
      <h4
        className="flex gap-sm"
        style={{ alignItems: "center", marginBottom: "0.5rem" }}
      >
        <FiCode /> AI Debug Log
      </h4>
      {entries.map((entry, i) => (
        <DebugEntry key={i} entry={entry} />
      ))}
    </div>
  );
}
