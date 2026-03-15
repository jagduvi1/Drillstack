export default function BreakBlock({ block, onChange }) {
  return (
    <div className="flex gap-sm" style={{ alignItems: "center" }}>
      <label className="text-sm">Duration:</label>
      <input
        type="number"
        className="form-control form-control-sm"
        value={block.duration || 0}
        onChange={(e) =>
          onChange({ ...block, duration: parseInt(e.target.value, 10) || 0 })
        }
        min={0}
        style={{ width: 80 }}
      />
      <span className="text-sm text-muted">minutes</span>
      <input
        className="form-control form-control-sm"
        placeholder="Notes (optional)"
        value={block.notes || ""}
        onChange={(e) => onChange({ ...block, notes: e.target.value })}
        style={{ flex: 1 }}
      />
    </div>
  );
}
