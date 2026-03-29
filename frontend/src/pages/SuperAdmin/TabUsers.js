import { useState } from "react";
import { ago, PlanBadge, RoleBadge, useApi } from "./helpers";
import { getUsers, updateUserPlan } from "../../api/superadmin";

export default function TabUsers() {
  const { data, loading, error, reload } = useApi(getUsers);
  const [editingUser, setEditingUser] = useState(null);
  const [editPlan, setEditPlan] = useState("starter");
  const [trialDays, setTrialDays] = useState(30);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="sa-loading">Loading users...</div>;
  if (error) return <div className="sa-error">Error: {error}</div>;
  if (!data) return null;

  const users = data.users || [];

  const handleSavePlan = async (userId) => {
    setSaving(true);
    try {
      await updateUserPlan(userId, { plan: editPlan });
      setEditingUser(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleGrantTrial = async (userId) => {
    setSaving(true);
    try {
      await updateUserPlan(userId, { grantTrial: true, trialDays });
      setEditingUser(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to grant trial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-panel">
      <div className="sa-panel-header">
        <span className="sa-panel-title">Users ({data.total || users.length})</span>
        <button className="sa-btn" onClick={reload}>Refresh</button>
      </div>
      <div className="sa-panel-body">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Trial</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td><PlanBadge plan={u.plan} /></td>
                  <td>
                    {u.trialPlan && u.trialEndsAt && new Date(u.trialEndsAt) > new Date() ? (
                      <span className="sa-badge ok">{u.trialPlan} until {new Date(u.trialEndsAt).toLocaleDateString()}</span>
                    ) : u.trialUsed ? (
                      <span style={{ color: "var(--sa-text-dim)" }}>Used</span>
                    ) : (
                      <span style={{ color: "var(--sa-text-dim)" }}>—</span>
                    )}
                  </td>
                  <td className="mono">{ago(u.createdAt)}</td>
                  <td>
                    <button
                      className="sa-btn"
                      onClick={() => { setEditingUser(editingUser === u._id ? null : u._id); setEditPlan(u.plan || "starter"); }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingUser && (() => {
          const u = users.find(x => x._id === editingUser);
          if (!u) return null;
          return (
            <div style={{ marginTop: 12, padding: 14, border: "1px solid var(--sa-accent2)", borderRadius: "var(--sa-radius)" }}>
              <div style={{ marginBottom: 8, color: "var(--sa-accent2)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                Managing: {u.name} ({u.email})
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div className="sa-kv-key" style={{ marginBottom: 4 }}>Change Plan</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="sa-input" value={editPlan} onChange={e => setEditPlan(e.target.value)} style={{ width: "auto", flex: "none" }}>
                      <option value="starter">Starter (Free)</option>
                      <option value="coach">Coach</option>
                      <option value="pro">Pro</option>
                    </select>
                    <button className="sa-btn" onClick={() => handleSavePlan(u._id)} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="sa-kv-key" style={{ marginBottom: 4 }}>Grant Pro Trial</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" className="sa-input" value={trialDays} onChange={e => setTrialDays(e.target.value)} min={1} max={365} style={{ width: 60, flex: "none" }} />
                    <span style={{ color: "var(--sa-text-dim)", fontSize: 11 }}>days</span>
                    <button className="sa-btn" onClick={() => handleGrantTrial(u._id)} disabled={saving}>
                      {saving ? "Granting..." : "Grant"}
                    </button>
                  </div>
                </div>
              </div>
              <button className="sa-btn" style={{ marginTop: 10 }} onClick={() => setEditingUser(null)}>Close</button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
