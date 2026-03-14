import { useAuth } from "../context/AuthContext";
import useFetch from "../hooks/useFetch";
import { getDrills } from "../api/drills";
import { getSessions } from "../api/sessions";
import { getPlans } from "../api/plans";
import { Link } from "react-router-dom";
import { FiZap, FiPlay, FiCalendar, FiSearch } from "react-icons/fi";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: drillData } = useFetch(() => getDrills({ limit: 5 }));
  const { data: sessionData } = useFetch(() => getSessions({ limit: 5 }));
  const { data: planData } = useFetch(() => getPlans());

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Welcome, {user?.name}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiPlay style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">Drills</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{drillData?.total ?? "..."}</div>
          <Link to="/drills/new" className="btn btn-primary btn-sm mt-1"><FiZap /> Create with AI</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiCalendar style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">Sessions</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{sessionData?.total ?? "..."}</div>
          <Link to="/sessions/new" className="btn btn-primary btn-sm mt-1">New Session</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiCalendar style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">Plans</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{planData?.length ?? "..."}</div>
          <Link to="/plans/new" className="btn btn-primary btn-sm mt-1">New Plan</Link>
        </div>
        <div className="card">
          <div className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
            <FiSearch style={{ color: "var(--color-primary)" }} />
            <span className="text-muted text-sm">Search</span>
          </div>
          <p className="text-sm text-muted" style={{ marginTop: "0.5rem" }}>Find drills by describing what you need</p>
          <Link to="/search" className="btn btn-secondary btn-sm mt-1">Search Drills</Link>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem" }}>Recent Drills</h2>
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
        <p className="text-muted">No drills yet. Create your first drill to get started.</p>
      )}
    </div>
  );
}
