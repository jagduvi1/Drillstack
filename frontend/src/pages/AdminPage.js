import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getReports, resolveReport } from "../api/reports";
import { getPendingClubs, verifyClub } from "../api/groups";
import { FiFlag, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle } from "react-icons/fi";

const STATUS_COLORS = {
  pending: "var(--color-warning)",
  reviewed: "var(--color-primary)",
  resolved: "var(--color-success)",
  dismissed: "var(--color-text-muted)",
};

export default function AdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState("reports");

  if (user?.role !== "admin" && !user?.isSuperAdmin) {
    return <div className="card"><p className="text-muted">{t("common.accessDenied")}</p></div>;
  }

  return (
    <div>
      <h1>{t("adminPage.title")}</h1>
      <p className="text-muted text-sm" style={{ marginBottom: "1rem" }}>
        {t("adminPage.description")}
      </p>
      <div className="tab-bar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`btn ${tab === "reports" ? "btn-primary" : "btn-secondary"} btn-sm`}
          onClick={() => setTab("reports")}
        >
          <FiFlag /> {t("adminPage.reports")}
        </button>
        <button
          className={`btn ${tab === "clubs" ? "btn-primary" : "btn-secondary"} btn-sm`}
          onClick={() => setTab("clubs")}
        >
          <FiCheckCircle /> {t("adminPage.pendingClubs")}
        </button>
      </div>

      {tab === "reports" && <ReportsPanel />}
      {tab === "clubs" && <ClubsPanel />}
    </div>
  );
}

function ReportsPanel() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReports({ status: filter || undefined });
      setReports(res.data || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleResolve = async (id, status) => {
    setBusyId(id);
    try {
      await resolveReport(id, { status });
      await load();
    } catch {
      // best effort
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0 }}><FiFlag /> {t("adminPage.reports")}</h2>
        <select
          className="form-control"
          style={{ width: "auto" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">{t("adminPage.allStatuses")}</option>
          <option value="pending">{t("adminPage.statusPending")}</option>
          <option value="reviewed">{t("adminPage.statusReviewed")}</option>
          <option value="resolved">{t("adminPage.statusResolved")}</option>
          <option value="dismissed">{t("adminPage.statusDismissed")}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : reports.length === 0 ? (
        <p className="text-muted">{t("adminPage.noReports")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reports.map((r) => (
            <div key={r._id} className="card" style={{ padding: "0.75rem", background: "var(--color-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span className="tag" style={{ background: STATUS_COLORS[r.status] || "var(--color-bg)", color: "#fff", fontSize: "0.7rem" }}>
                      {r.status}
                    </span>
                    <span className="text-sm text-muted">
                      {r.targetType} &middot; {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0" }}>{r.reason}</p>
                  <div className="text-xs text-muted">
                    {t("adminPage.reportedBy")}: {r.reportedBy?.name || r.reportedBy?.email || "—"}
                    {r.resolvedBy ? ` · ${t("adminPage.resolvedBy")}: ${r.resolvedBy.name}` : ""}
                    {r.resolution ? ` · ${r.resolution}` : ""}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={busyId === r._id}
                      onClick={() => handleResolve(r._id, "resolved")}
                      title={t("adminPage.resolve")}
                    >
                      <FiCheckCircle />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === r._id}
                      onClick={() => handleResolve(r._id, "dismissed")}
                      title={t("adminPage.dismiss")}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubsPanel() {
  const { t } = useTranslation();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPendingClubs();
      setClubs(res.data || []);
    } catch {
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id, verified) => {
    setBusyId(id);
    try {
      await verifyClub(id, verified);
      await load();
    } catch {
      // best effort
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <h2 style={{ margin: "0 0 1rem" }}><FiAlertTriangle /> {t("adminPage.pendingClubs")}</h2>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : clubs.length === 0 ? (
        <p className="text-muted">{t("adminPage.noClubs")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {clubs.map((c) => (
            <div key={c._id} className="card" style={{ padding: "0.75rem", background: "var(--color-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="text-xs text-muted">
                    <FiClock style={{ verticalAlign: "middle" }} /> {new Date(c.createdAt).toLocaleDateString()}
                    {c.createdBy ? ` · ${c.createdBy.name || c.createdBy.email}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    className="btn btn-success btn-sm"
                    disabled={busyId === c._id}
                    onClick={() => handleVerify(c._id, true)}
                  >
                    <FiCheckCircle /> {t("adminPage.verify")}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === c._id}
                    onClick={() => handleVerify(c._id, false)}
                  >
                    <FiXCircle /> {t("adminPage.reject")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
