import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getSessions } from "../../api/sessions";
import { FiSearch, FiX } from "react-icons/fi";

export default function SessionPickerModal({ onSelect, onClose, sport }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 100 };
    if (sport) params.sport = sport;
    getSessions(params)
      .then((res) => setSessions(res.data.sessions || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport]);

  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.sport?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t("picker.pickASession")}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: "1rem" }}>
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
            placeholder={t("picker.searchSessions")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="loading">{t("picker.loadingSessions")}</div>
        ) : filtered.length === 0 ? (
          <p className="text-muted">{t("picker.noSessionsFound")}</p>
        ) : (
          <div className="drill-picker-list">
            {filtered.map((s) => (
              <button
                key={s._id}
                className="drill-picker-card"
                onClick={() => onSelect(s)}
              >
                <div className="flex-between">
                  <strong>{s.title}</strong>
                  <div className="flex gap-sm">
                    {s.sport && <span className="tag">{s.sport}</span>}
                    <span className="tag">{s.totalDuration || 0} min</span>
                  </div>
                </div>
                {s.description && (
                  <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                    {s.description.slice(0, 100)}
                    {s.description.length > 100 ? "..." : ""}
                  </p>
                )}
                <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
                  {s.blocks?.length > 0 && (
                    <span className="text-sm text-muted">
                      {s.blocks.length} block{s.blocks.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {s.date && (
                    <span className="text-sm text-muted">
                      {new Date(s.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
