export default function CustomBlock({ block, onChange }) {
  const set = (field, value) => onChange({ ...block, [field]: value });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem" }}>
        <div className="form-group">
          <label className="text-sm">Content</label>
          <textarea
            className="form-control form-control-sm"
            placeholder="Describe what happens in this block..."
            value={block.customContent || ""}
            onChange={(e) => set("customContent", e.target.value)}
            style={{ minHeight: 60 }}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">Duration (min)</label>
          <input
            type="number"
            className="form-control form-control-sm"
            value={block.duration || 0}
            onChange={(e) => set("duration", parseInt(e.target.value, 10) || 0)}
            min={0}
            style={{ width: 80 }}
          />
        </div>
      </div>
      <div className="form-group">
        <input
          className="form-control form-control-sm"
          placeholder="Notes (optional)"
          value={block.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
