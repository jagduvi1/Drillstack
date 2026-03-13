import { useState, useEffect, useCallback } from "react";
import * as adminApi from "../api/superadmin";

const TABS = ["overview", "services", "database", "ai", "users", "audit"];

export default function SuperAdminPage() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchTab = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      switch (tab) {
        case "overview": res = await adminApi.getOverview(); break;
        case "services": res = await adminApi.getServices(); break;
        case "database": res = await adminApi.getDatabase(); break;
        case "ai": res = await adminApi.getAISettings(); break;
        case "users": res = await adminApi.getUsers(); break;
        case "audit": res = await adminApi.getAuditLog({ limit: 100 }); break;
        default: return;
      }
      setData(res.data);
    } catch (err) {
      setData({ error: err.response?.data?.error || "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchTab, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchTab]);

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>Super Admin</h1>
        <div className="flex gap-sm">
          <label className="text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {" "}Auto-refresh
          </label>
          <button className="btn btn-secondary btn-sm" onClick={fetchTab}>Refresh</button>
        </div>
      </div>

      <div className="flex gap-sm mb-1" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t)}
            style={{ textTransform: "capitalize" }}
          >
            {t === "ai" ? "AI & Embeddings" : t}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="loading">Loading...</div>
      ) : data?.error ? (
        <div className="alert alert-danger">{data.error}</div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "services" && <ServicesTab data={data} />}
          {tab === "database" && <DatabaseTab data={data} />}
          {tab === "ai" && <AITab data={data} onRefresh={fetchTab} />}
          {tab === "users" && <UsersTab data={data} />}
          {tab === "audit" && <AuditTab data={data} />}
        </>
      )}
    </div>
  );
}

// ── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  if (!data) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
      {[
        { label: "Users", value: data.users },
        { label: "Drills", value: data.drills },
        { label: "Sessions", value: data.sessions },
        { label: "Plans", value: data.plans },
      ].map((m) => (
        <div key={m.label} className="card">
          <div className="text-muted text-sm">{m.label}</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{m.value}</div>
        </div>
      ))}
      {data.roles && (
        <div className="card">
          <div className="text-muted text-sm">Roles</div>
          {Object.entries(data.roles).map(([role, count]) => (
            <div key={role}><span className="tag">{role}</span> {count}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesTab({ data }) {
  if (!data) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Service</th><th>Status</th><th>Latency</th></tr></thead>
          <tbody>
            {Object.entries(data).map(([name, info]) => (
              <tr key={name}>
                <td style={{ textTransform: "capitalize" }}>{name}</td>
                <td>
                  <span className={`tag ${info.status === "ok" || info.status === "configured" ? "" : "tag-danger"}`}>
                    {info.status}
                  </span>
                </td>
                <td>{info.latency ? `${info.latency}ms` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatabaseTab({ data }) {
  if (!data || !Array.isArray(data)) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Collection</th><th>Documents</th><th>Size</th><th>Indexes</th></tr></thead>
          <tbody>
            {data.map((col) => (
              <tr key={col.name}>
                <td>{col.name}</td>
                <td>{col.documents}</td>
                <td>{(col.size / 1024).toFixed(1)} KB</td>
                <td>{col.indexes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AITab({ data, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (!data) return null;

  const settings = data.settings || {};
  const defaults = data.defaults || {};

  const handleSave = async (key) => {
    try {
      let value = editValue;
      if (key === "embedding_dimensions") value = parseInt(value, 10);
      await adminApi.updateAISetting(key, value);
      setEditing(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const handleReset = async (key) => {
    if (!window.confirm(`Reset ${key} to default?`)) return;
    await adminApi.resetAISetting(key);
    onRefresh();
  };

  const rows = [
    { key: "ai_provider", label: "AI Provider", hint: "openai / anthropic / ollama" },
    { key: "ai_model", label: "AI Model", hint: "e.g. claude-sonnet-4-6, gpt-4o" },
    { key: "embedding_provider", label: "Embedding Provider", hint: "voyage / openai / ollama" },
    { key: "embedding_model", label: "Embedding Model", hint: "e.g. voyage-3-lite" },
    { key: "embedding_dimensions", label: "Embedding Dimensions", hint: "e.g. 1024" },
    { key: "ai_system_prompt", label: "System Prompt", hint: "Base prompt for AI assistance" },
  ];

  return (
    <div className="card">
      <h3 style={{ marginBottom: "1rem" }}>AI & Embedding Configuration</h3>
      <p className="text-sm text-muted mb-1">
        These settings are stored in the database and can be changed without restarting.
        API keys remain in .env for security.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Setting</th><th>Current Value</th><th>Default</th><th></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="text-sm text-muted">{row.hint}</div>
                </td>
                <td>
                  {editing === row.key ? (
                    <div className="flex gap-sm">
                      {row.key === "ai_system_prompt" ? (
                        <textarea
                          className="form-control"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ minHeight: 60, minWidth: 250 }}
                        />
                      ) : (
                        <input
                          className="form-control"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ minWidth: 200 }}
                        />
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => handleSave(row.key)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <span
                      className="text-sm"
                      style={{ cursor: "pointer" }}
                      onClick={() => { setEditing(row.key); setEditValue(String(settings[row.key] || "")); }}
                      title="Click to edit"
                    >
                      {row.key === "ai_system_prompt"
                        ? (settings[row.key] || "").slice(0, 80) + "..."
                        : String(settings[row.key] || "-")}
                    </span>
                  )}
                </td>
                <td className="text-sm text-muted">
                  {row.key === "ai_system_prompt"
                    ? (defaults[row.key] || "").slice(0, 40) + "..."
                    : String(defaults[row.key] || "-")}
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleReset(row.key)}>Reset</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ data }) {
  if (!data) return null;
  const users = data.users || [];
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Sports</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="tag">{u.role}</span></td>
                <td>{u.sports?.join(", ") || "-"}</td>
                <td className="text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTab({ data }) {
  if (!data || !Array.isArray(data)) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>User</th><th>IP</th><th>Details</th></tr></thead>
          <tbody>
            {data.map((log) => (
              <tr key={log._id}>
                <td className="text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                <td><span className="tag">{log.action}</span></td>
                <td className="text-sm">{log.email || log.userId?.email || "-"}</td>
                <td className="text-sm">{log.ip}</td>
                <td className="text-sm text-muted">{JSON.stringify(log.details || {}).slice(0, 80)}</td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>No audit logs</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
