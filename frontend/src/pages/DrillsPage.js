import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getDrills, deleteDrill } from "../api/drills";
import TagBadge from "../components/common/TagBadge";

export default function DrillsPage() {
  const [page, setPage] = useState(1);
  const [sport, setSport] = useState("");
  const { data, loading, refetch } = useFetch(
    () => getDrills({ page, sport: sport || undefined }),
    [page, sport]
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this drill?")) return;
    await deleteDrill(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Drills</h1>
        <Link to="/drills/new" className="btn btn-primary">+ New Drill</Link>
      </div>

      <div className="flex gap-sm mb-1">
        <input
          className="form-control"
          placeholder="Filter by sport..."
          style={{ maxWidth: 200 }}
          value={sport}
          onChange={(e) => { setSport(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Purpose</th>
                    <th>Intensity</th>
                    <th>Duration</th>
                    <th>Tags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.drills?.map((d) => (
                    <tr key={d._id}>
                      <td><Link to={`/drills/${d._id}`}>{d.title}</Link></td>
                      <td className="text-sm">{d.purpose?.slice(0, 60)}{d.purpose?.length > 60 ? "..." : ""}</td>
                      <td><TagBadge name={d.intensity} /></td>
                      <td>{d.duration} min</td>
                      <td>
                        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                          {d.tags?.slice(0, 3).map((t, i) => (
                            <TagBadge key={i} category={t.category} name={t.taxonomy?.name || t.category} />
                          ))}
                          {d.tags?.length > 3 && <span className="text-muted text-sm">+{d.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-sm">
                          <Link to={`/drills/${d._id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data?.drills?.length && (
                    <tr><td colSpan={6} className="text-muted" style={{ textAlign: "center" }}>No drills found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data?.pages > 1 && (
            <div className="flex gap-sm mt-1" style={{ justifyContent: "center" }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
