import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getSessions, deleteSession } from "../api/sessions";

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useFetch(() => getSessions({ page }), [page]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this session?")) return;
    await deleteSession(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Training Sessions</h1>
        <Link to="/sessions/new" className="btn btn-primary">+ New Session</Link>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Date</th><th>Duration</th><th>Warnings</th><th></th></tr>
              </thead>
              <tbody>
                {data?.sessions?.map((s) => (
                  <tr key={s._id}>
                    <td><Link to={`/sessions/${s._id}`}>{s.title}</Link></td>
                    <td>{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                    <td>{s.totalDuration} min</td>
                    <td>
                      {s.warnings?.length > 0 && (
                        <span className="tag tag-warning">{s.warnings.length} warning(s)</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <Link to={`/sessions/${s._id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.sessions?.length && (
                  <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>No sessions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.pages > 1 && (
        <div className="flex gap-sm mt-1" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
