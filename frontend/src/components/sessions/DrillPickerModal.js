import { useState, useEffect } from "react";
import { getDrills } from "../../api/drills";
import { FiSearch, FiStar, FiX } from "react-icons/fi";

export default function DrillPickerModal({ onSelect, onClose, sport }) {
  const [drills, setDrills] = useState([]);
  const [search, setSearch] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 100, starredFirst: true };
    if (sport) params.sport = sport;
    if (starredOnly) params.starred = true;
    getDrills(params)
      .then((res) => setDrills(res.data.drills || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, starredOnly]);

  const filtered = drills.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.sport?.toLowerCase().includes(q)
    );
  });

  const starred = filtered.filter((d) => d.isStarred);
  const rest = filtered.filter((d) => !d.isStarred);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pick a Drill</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="flex gap-sm mb-1">
          <div style={{ flex: 1, position: "relative" }}>
            <FiSearch
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-muted)",
              }}
            />
            <input
              className="form-control"
              placeholder="Search drills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
              autoFocus
            />
          </div>
          <button
            className={`btn btn-sm ${starredOnly ? "btn-star-active" : "btn-secondary"}`}
            onClick={() => setStarredOnly(!starredOnly)}
          >
            <FiStar /> {starredOnly ? "Starred" : "All"}
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading drills...</div>
        ) : filtered.length === 0 ? (
          <p className="text-muted">No drills found.</p>
        ) : (
          <div className="drill-picker-list">
            {starred.length > 0 && !starredOnly && (
              <div className="text-sm text-muted" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                Your Starred Drills
              </div>
            )}
            {starred.map((d) => (
              <DrillPickerCard key={d._id} drill={d} onSelect={onSelect} />
            ))}
            {starred.length > 0 && rest.length > 0 && !starredOnly && (
              <div
                className="text-sm text-muted"
                style={{ margin: "0.75rem 0 0.5rem", fontWeight: 600 }}
              >
                All Drills
              </div>
            )}
            {rest.map((d) => (
              <DrillPickerCard key={d._id} drill={d} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillPickerCard({ drill, onSelect }) {
  return (
    <button
      className="drill-picker-card"
      onClick={() => onSelect(drill)}
    >
      <div className="flex-between">
        <strong>{drill.title}</strong>
        <div className="flex gap-sm">
          {drill.isStarred && (
            <FiStar style={{ color: "#f59e0b", fill: "#f59e0b", fontSize: "0.85rem" }} />
          )}
          <span
            className={`tag tag-${drill.intensity === "high" ? "danger" : drill.intensity === "low" ? "" : "warning"}`}
          >
            {drill.intensity}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
        {drill.description?.slice(0, 100)}
        {drill.description?.length > 100 ? "..." : ""}
      </p>
      <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
        {drill.sport && <span className="tag">{drill.sport}</span>}
        {drill.setup?.duration && (
          <span className="tag">{drill.setup.duration}</span>
        )}
      </div>
    </button>
  );
}
