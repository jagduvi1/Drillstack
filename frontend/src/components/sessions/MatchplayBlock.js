export default function MatchplayBlock({ block, onChange }) {
  const set = (field, value) => onChange({ ...block, [field]: value });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem" }}>
        <div className="form-group">
          <label className="text-sm">Game description</label>
          <textarea
            className="form-control form-control-sm"
            placeholder="e.g. 4v4 on small goals, transition game..."
            value={block.matchDescription || ""}
            onChange={(e) => set("matchDescription", e.target.value)}
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
        <label className="text-sm">Rules (optional)</label>
        <input
          className="form-control form-control-sm"
          placeholder="e.g. Max 3 touches, must play through the middle..."
          value={block.rules || ""}
          onChange={(e) => set("rules", e.target.value)}
        />
      </div>
      <div className="form-group">
        <input
          className="form-control form-control-sm"
          placeholder="Coaching notes (optional)"
          value={block.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
