import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getPlans, deletePlan } from "../api/plans";

export default function PlansPage() {
  const { data: plans, loading, refetch } = useFetch(() => getPlans());

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    await deletePlan(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Period / Season Plans</h1>
        <Link to="/plans/new" className="btn btn-primary">+ New Plan</Link>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Sport</th><th>Period</th><th>Focus Blocks</th><th></th></tr>
              </thead>
              <tbody>
                {plans?.map((p) => (
                  <tr key={p._id}>
                    <td><Link to={`/plans/${p._id}`}>{p.title}</Link></td>
                    <td>{p.sport || "All"}</td>
                    <td className="text-sm">
                      {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                    </td>
                    <td>{p.focusBlocks?.length || 0}</td>
                    <td>
                      <div className="flex gap-sm">
                        <Link to={`/plans/${p._id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!plans?.length && (
                  <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>No plans yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
