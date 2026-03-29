import { fmtDate, actionClass, useApi } from "./helpers";
import { getAuditLog } from "../../api/superadmin";

const fetchAudit = () => getAuditLog({ limit: 100 });

export default function TabAudit() {
  const { data, loading, error, reload } = useApi(fetchAudit);

  if (loading) return <div className="sa-loading">Loading audit log...</div>;
  if (error) return <div className="sa-error">Error: {error}</div>;
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="sa-panel">
      <div className="sa-panel-header">
        <span className="sa-panel-title">Audit Log ({data.length} entries)</span>
        <button className="sa-btn" onClick={reload}>Refresh</button>
      </div>
      <div className="sa-panel-body">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>IP</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map(log => (
                <tr key={log._id}>
                  <td className="mono">{fmtDate(log.createdAt)}</td>
                  <td><span className={actionClass(log.action)}>{log.action}</span></td>
                  <td className="mono">{log.email || log.userId?.email || "—"}</td>
                  <td className="mono">{log.ip || "—"}</td>
                  <td style={{ color: "var(--sa-text-dim)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {JSON.stringify(log.details || {}).slice(0, 80)}
                  </td>
                </tr>
              ))}
              {!data.length && (
                <tr><td colSpan={5} className="sa-empty">No audit logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
