import { useParams, Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getPlan, deletePlan, getCoverage } from "../api/plans";
import TagBadge from "../components/common/TagBadge";

export default function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: plan, loading } = useFetch(() => getPlan(id), [id]);
  const { data: coverage } = useFetch(() => getCoverage(id), [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!plan) return <div className="alert alert-danger">Plan not found</div>;

  const handleDelete = async () => {
    if (!window.confirm("Delete this plan?")) return;
    await deletePlan(id);
    navigate("/plans");
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{plan.title}</h1>
        <div className="flex gap-sm">
          <Link to={`/plans/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="card mb-1">
        <div className="flex gap-sm">
          {plan.sport && <TagBadge name={plan.sport} />}
          <TagBadge name={`${new Date(plan.startDate).toLocaleDateString()} — ${new Date(plan.endDate).toLocaleDateString()}`} />
        </div>
      </div>

      {/* Focus Blocks */}
      {plan.focusBlocks?.length > 0 && (
        <div className="card mb-1">
          <h3>Focus Blocks</h3>
          <div className="table-wrap mt-1">
            <table>
              <thead><tr><th>Name</th><th>Weeks</th><th>Priority</th><th>Tags</th></tr></thead>
              <tbody>
                {plan.focusBlocks.map((fb, i) => (
                  <tr key={i}>
                    <td>{fb.name}</td>
                    <td>{fb.startWeek} — {fb.endWeek}</td>
                    <td><TagBadge name={fb.priority} variant={fb.priority === "primary" ? "" : "warning"} /></td>
                    <td>
                      <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                        {fb.tags?.map((t, j) => (
                          <TagBadge key={j} name={t.name || t} category={t.category} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Plans */}
      {plan.weeklyPlans?.length > 0 && (
        <div className="card mb-1">
          <h3>Weekly Plans</h3>
          {plan.weeklyPlans.map((w, i) => (
            <div key={i} className="section-block">
              <h4>Week {w.week}</h4>
              {w.sessions?.length > 0 && (
                <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                  {w.sessions.map((s, j) => (
                    <Link key={j} to={`/sessions/${s._id || s}`} className="tag">{s.title || "Session"}</Link>
                  ))}
                </div>
              )}
              {w.observationNotes && <p className="text-sm text-muted mt-1">{w.observationNotes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Coverage Tracking */}
      {coverage && Object.keys(coverage).length > 0 && (
        <div className="card mb-1">
          <h3>Coverage Tracking</h3>
          <p className="text-sm text-muted mb-1">How many times each concept has been trained</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Concept</th><th>Times Trained</th></tr></thead>
              <tbody>
                {Object.entries(coverage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => (
                    <tr key={key}>
                      <td>{key.replace(":", " — ")}</td>
                      <td><strong>{count}</strong></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
