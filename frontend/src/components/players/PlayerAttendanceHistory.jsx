import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPlayerAttendance } from "../../api/players";
import { FiCheck, FiX, FiCalendar } from "react-icons/fi";

export default function PlayerAttendanceHistory({ groupId, playerId, attendanceSummary }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlayerAttendance(groupId, playerId)
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId, playerId]);

  if (loading) return <p className="text-sm text-muted">{t("common.loading")}</p>;

  return (
    <div>
      {attendanceSummary && (
        <div className="attendance-summary-card" style={{ marginBottom: "1rem" }}>
          <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
            {attendanceSummary.rate !== null && (
              <div className="stat-card">
                <span className="stat-value">{attendanceSummary.rate}%</span>
                <span className="stat-label">{t("playerProfile.attendanceRate")}</span>
              </div>
            )}
            <div className="stat-card">
              <span className="stat-value">{attendanceSummary.recentAttended}/{attendanceSummary.recentTotal}</span>
              <span className="stat-label">{t("playerProfile.last90Days")}</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{attendanceSummary.total}</span>
              <span className="stat-label">{t("playerProfile.totalSessions")}</span>
            </div>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-muted">{t("playerProfile.noAttendance")}</p>
      ) : (
        <div className="attendance-history-list">
          {sessions.map((s) => (
            <div key={s._id} className="attendance-history-item">
              <span className={`attendance-status ${s.attended ? "status-present" : "status-absent"}`}>
                {s.attended ? <FiCheck /> : <FiX />}
              </span>
              <span className="text-sm">{s.title}</span>
              <span className="text-xs text-muted">
                <FiCalendar style={{ fontSize: "0.65rem" }} /> {s.date ? new Date(s.date).toLocaleDateString() : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
