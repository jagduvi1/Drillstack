import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getDrills } from "../api/drills";
import { getSessions } from "../api/sessions";
import { getPlans } from "../api/plans";
import { getUsage, startTrial } from "../api/billing";
import { Link } from "react-router-dom";
import { FiZap, FiPlay, FiCalendar, FiSearch, FiAward } from "react-icons/fi";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: drillData } = useFetch(() => getDrills({ limit: 5 }));
  const { data: sessionData } = useFetch(() => getSessions({ limit: 5 }));
  const { data: planData } = useFetch(() => getPlans());

  const [billing, setBilling] = useState(null);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialMsg, setTrialMsg] = useState("");

  useEffect(() => {
    getUsage().then((res) => setBilling(res.data)).catch(() => {});
  }, []);

  const handleStartTrial = async () => {
    setTrialStarting(true);
    try {
      const res = await startTrial();
      setTrialMsg(res.data.message);
      const u = await getUsage();
      setBilling(u.data);
    } catch (err) {
      setTrialMsg(err.response?.data?.error || t("dashboard.failedToStartTrial"));
    } finally {
      setTrialStarting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>{t("dashboard.welcome", { name: user?.name })}</h1>

      {/* Trial banner for new users */}
      {billing?.trial?.canStartTrial && billing?.plan !== "pro" && !trialMsg && (
        <div className="card" style={{
          background: "linear-gradient(135deg, #eff6ff, #f0f4ff)",
          border: "1px solid #93c5fd",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem 1.25rem",
        }}>
          <FiAward style={{ fontSize: "1.5rem", color: "var(--color-primary)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>{t("dashboard.tryProFree")}</strong>
            <p className="text-sm text-muted" style={{ margin: 0 }}>{t("dashboard.tryProDesc")}</p>
          </div>
          <button className="btn btn-primary" onClick={handleStartTrial} disabled={trialStarting}>
            <FiZap /> {trialStarting ? t("dashboard.starting") : t("dashboard.startTrial")}
          </button>
        </div>
      )}
      {trialMsg && (
        <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>{trialMsg}</div>
      )}
      {billing?.trial?.active && (
        <div className="card" style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          marginBottom: "1.5rem",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <FiAward style={{ color: "var(--color-success)" }} />
          <span className="text-sm">
            <strong>{t("dashboard.proTrialActive")}</strong> — {t("dashboard.daysRemaining", { days: billing.trial.daysLeft })}{" "}
            <Link to="/pricing">{t("dashboard.viewPlans")}</Link>
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiPlay style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">{t("nav.drills")}</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{drillData?.total ?? "..."}</div>
          <Link to="/drills/new" className="btn btn-primary btn-sm mt-1"><FiZap /> {t("dashboard.createWithAi")}</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiCalendar style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">{t("nav.sessions")}</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{sessionData?.total ?? "..."}</div>
          <Link to="/sessions/new" className="btn btn-primary btn-sm mt-1">{t("dashboard.newSession")}</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiCalendar style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">{t("nav.plans")}</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{planData?.length ?? "..."}</div>
          <Link to="/plans/new" className="btn btn-primary btn-sm mt-1">{t("dashboard.newPlan")}</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiSearch style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">{t("nav.search")}</span>
          </div>
          <p className="text-sm text-muted" style={{ marginTop: "0.5rem" }}>{t("dashboard.findDrillsDesc")}</p>
          <Link to="/search" className="btn btn-secondary btn-sm mt-1">{t("dashboard.searchDrills")}</Link>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem" }}>{t("dashboard.recentDrills")}</h2>
      {drillData?.drills?.length ? (
        <div className="drill-grid">
          {drillData.drills.map((d) => (
            <Link key={d._id} to={`/drills/${d._id}`} className="drill-card card">
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{d.title}</h3>
              <p className="text-sm text-muted">{d.description?.slice(0, 100)}{d.description?.length > 100 ? "..." : ""}</p>
              <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
                {d.sport && <span className="tag">{d.sport}</span>}
                <span className={`tag tag-${d.intensity === "high" ? "danger" : d.intensity === "low" ? "" : "warning"}`}>{d.intensity}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted">{t("dashboard.noDrillsYet")}</p>
      )}
    </div>
  );
}
