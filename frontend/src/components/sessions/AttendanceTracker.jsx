import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPlayers } from "../../api/players";
import { updateAttendance } from "../../api/sessions";
import { FiCheck, FiUsers } from "react-icons/fi";

export default function AttendanceTracker({ sessionId, groupId, initialAttendees }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [present, setPresent] = useState(new Set((initialAttendees || []).map((a) => a?._id || a)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    getPlayers(groupId).then((res) => setPlayers(res.data)).catch(() => {});
  }, [groupId]);

  const toggle = (playerId) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateAttendance(sessionId, [...present]);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (!groupId || players.length === 0) return null;

  return (
    <div className="attendance-tracker">
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }}>
          <FiUsers style={{ marginRight: "0.3rem" }} />
          {t("players.attendance")} ({present.size}/{players.length})
        </h4>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          <FiCheck /> {saving ? "..." : t("common.save")}
        </button>
      </div>
      <div className="attendance-grid">
        {players.map((p) => (
          <button
            key={p._id}
            className={`attendance-player ${present.has(p._id) ? "present" : ""}`}
            onClick={() => toggle(p._id)}
          >
            <span className="attendance-name">{p.name}</span>
            {p.position && <span className="attendance-pos">{p.position}</span>}
            {present.has(p._id) && <FiCheck className="attendance-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}
