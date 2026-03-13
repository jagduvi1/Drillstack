import { useParams, Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getSession, deleteSession } from "../api/sessions";
import TagBadge from "../components/common/TagBadge";

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session, loading } = useFetch(() => getSession(id), [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!session) return <div className="alert alert-danger">Session not found</div>;

  const handleDelete = async () => {
    if (!window.confirm("Delete this session?")) return;
    await deleteSession(id);
    navigate("/sessions");
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{session.title}</h1>
        <div className="flex gap-sm">
          <Link to={`/sessions/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="card mb-1">
        <div className="flex gap-sm">
          {session.sport && <TagBadge name={session.sport} />}
          <TagBadge name={`${session.totalDuration} min total`} />
          {session.date && <TagBadge name={new Date(session.date).toLocaleDateString()} />}
        </div>
      </div>

      {session.warnings?.length > 0 && (
        <div className="card mb-1">
          <h3>Warnings</h3>
          {session.warnings.map((w, i) => (
            <div key={i} className="alert alert-warning">{w.message}</div>
          ))}
        </div>
      )}

      {session.equipmentSummary?.length > 0 && (
        <div className="card mb-1">
          <h3>Equipment Needed</h3>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {session.equipmentSummary.map((eq, i) => (
              <TagBadge key={i} name={`${eq.name} x${eq.quantity}`} />
            ))}
          </div>
        </div>
      )}

      {session.sections?.map((section, i) => (
        <div key={i} className="card mb-1">
          <h3 style={{ textTransform: "capitalize" }}>{section.type.replace(/_/g, " ")}</h3>
          {section.drills?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Drill</th><th>Duration</th><th>Intensity</th><th>Notes</th></tr></thead>
                <tbody>
                  {section.drills.map((d, j) => (
                    <tr key={j}>
                      <td>
                        {d.drill?._id ? (
                          <Link to={`/drills/${d.drill._id}`}>{d.drill.title}</Link>
                        ) : (
                          d.drill?.title || "Unknown"
                        )}
                      </td>
                      <td>{d.duration} min</td>
                      <td>{d.drill?.intensity && <TagBadge name={d.drill.intensity} />}</td>
                      <td className="text-sm text-muted">{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-sm">No drills in this section</p>
          )}
          {section.notes && <p className="text-sm mt-1">{section.notes}</p>}
        </div>
      ))}
    </div>
  );
}
