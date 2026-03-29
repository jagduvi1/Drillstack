import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNotifications, forkSnapshot, dismissNotification } from "../api/notifications";
import { FiBell, FiCopy, FiX, FiAlertCircle } from "react-icons/fi";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let mounted = true;
    getNotifications()
      .then((res) => { if (mounted) setNotifications(res.data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleFork = async (notifId) => {
    setActionLoading(notifId);
    try {
      const res = await forkSnapshot(notifId);
      // Navigate to the newly created version
      navigate(`/drills/${res.data._id}`);
    } catch {
      alert(t("notifications.failedToFork"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (notifId) => {
    await dismissNotification(notifId).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n._id !== notifId));
  };

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}><FiBell /> {t("notifications.title")}</h1>

      {notifications.length === 0 ? (
        <div className="card">
          <p className="text-muted">{t("notifications.noNotifications")}</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n._id} className={`card mb-1 notification-card ${!n.read ? "notification-unread" : ""}`}>
              <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
                <FiAlertCircle
                  style={{ marginTop: "0.2rem", flexShrink: 0, color: "var(--color-warning)" }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ marginBottom: "0.5rem" }}>
                    {n.message}
                  </p>
                  {n.drillId && (
                    <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
                      {t("notifications.drillLabel")} <Link to={`/drills/${n.drillId._id || n.drillId}`}>
                        {n.drillId.title || "View drill"}
                      </Link>
                    </p>
                  )}
                  {n.snapshot && (
                    <div className="notification-snapshot">
                      <p className="text-sm" style={{ marginBottom: "0.25rem" }}>
                        <strong>{t("notifications.previousVersion")}</strong>
                      </p>
                      <p className="text-sm text-muted">
                        {n.snapshot.description?.slice(0, 150)}
                        {n.snapshot.description?.length > 150 ? "..." : ""}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-sm mt-1">
                    {n.snapshot && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleFork(n._id)}
                        disabled={actionLoading === n._id}
                      >
                        <FiCopy /> {actionLoading === n._id ? t("notifications.creating") : t("notifications.createMyVersion")}
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDismiss(n._id)}
                    >
                      <FiX /> {t("notifications.dismiss")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted" style={{ marginTop: "0.5rem", textAlign: "right" }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
