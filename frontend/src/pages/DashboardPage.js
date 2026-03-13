import { useAuth } from "../context/AuthContext";
import useFetch from "../hooks/useFetch";
import { getDrills } from "../api/drills";
import { getSessions } from "../api/sessions";
import { getPlans } from "../api/plans";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: drillData } = useFetch(() => getDrills({ limit: 5 }));
  const { data: sessionData } = useFetch(() => getSessions({ limit: 5 }));
  const { data: planData } = useFetch(() => getPlans());

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Welcome, {user?.name}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div className="text-muted text-sm">Drills</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{drillData?.total ?? "..."}</div>
          <Link to="/drills/new" className="btn btn-primary btn-sm mt-1">New Drill</Link>
        </div>
        <div className="card">
          <div className="text-muted text-sm">Sessions</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{sessionData?.total ?? "..."}</div>
          <Link to="/sessions/new" className="btn btn-primary btn-sm mt-1">New Session</Link>
        </div>
        <div className="card">
          <div className="text-muted text-sm">Period Plans</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{planData?.length ?? "..."}</div>
          <Link to="/plans/new" className="btn btn-primary btn-sm mt-1">New Plan</Link>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem" }}>Recent Drills</h2>
      {drillData?.drills?.length ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Intensity</th><th>Duration</th></tr>
              </thead>
              <tbody>
                {drillData.drills.map((d) => (
                  <tr key={d._id}>
                    <td><Link to={`/drills/${d._id}`}>{d.title}</Link></td>
                    <td><span className="tag">{d.intensity}</span></td>
                    <td>{d.duration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-muted">No drills yet. Create your first drill to get started.</p>
      )}
    </div>
  );
}
