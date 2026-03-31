import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import * as adminApi from "../api/superadmin";

const TABS = ["overview", "services", "database", "ai", "users", "audit"];

export default function SuperAdminPage() {
  // Hide sidebar while on this page
  useEffect(() => {
    document.body.classList.add("superadmin-active");
    return () => document.body.classList.remove("superadmin-active");
  }, []);
  const { t } = useTranslation();
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
      setData({ error: err.response?.data?.error || t("admin.failedToLoad") });
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
    <div className="superadmin-page">
      <div className="superadmin-header">
        <div className="flex gap-sm" style={{ alignItems: "center" }}>
          <Link to="/" className="btn btn-secondary btn-sm"><FiArrowLeft /></Link>
          <h1 style={{ margin: 0 }}>{t("admin.title")}</h1>
        </div>
        <div className="flex gap-sm">
          <label className="text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {" "}{t("admin.autoRefresh")}
          </label>
          <button className="btn btn-secondary btn-sm" onClick={fetchTab}>{t("common.refresh")}</button>
        </div>
      </div>

      <div className="superadmin-tabs">
        {(() => {
          const tabLabels = { overview: t("admin.overview"), services: t("admin.services"), database: t("admin.database"), ai: t("admin.aiEmbeddings"), users: t("admin.users"), audit: t("admin.audit") };
          return TABS.map((tb) => (
            <button
              key={tb}
              className={`btn btn-sm ${tab === tb ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(tb)}
            >
              {tabLabels[tb] || tb}
            </button>
          ));
        })()}
      </div>

      {loading && !data ? (
        <div className="loading">{t("common.loading")}</div>
      ) : data?.error ? (
        <div className="alert alert-danger">{data.error}</div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "services" && <ServicesTab data={data} />}
          {tab === "database" && <DatabaseTab data={data} />}
          {tab === "ai" && <AITab data={data} onRefresh={fetchTab} />}
          {tab === "users" && <UsersTab data={data} onRefresh={fetchTab} />}
          {tab === "audit" && <AuditTab data={data} />}
        </>
      )}
    </div>
  );
}

// ── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const { t } = useTranslation();
  if (!data) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
      {[
        { label: t("admin.usersLabel"), value: data.users },
        { label: t("admin.drillsLabel"), value: data.drills },
        { label: t("admin.sessionsLabel"), value: data.sessions },
        { label: t("admin.plansLabel"), value: data.plans },
      ].map((m) => (
        <div key={m.label} className="card">
          <div className="text-muted text-sm">{m.label}</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{m.value}</div>
        </div>
      ))}
      {data.roles && (
        <div className="card">
          <div className="text-muted text-sm">{t("admin.roles")}</div>
          {Object.entries(data.roles).map(([role, count]) => (
            <div key={role}><span className="tag">{role}</span> {count}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesTab({ data }) {
  const { t } = useTranslation();
  if (!data) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("admin.service")}</th><th>{t("admin.status")}</th><th>{t("admin.latency")}</th></tr></thead>
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
  const { t } = useTranslation();
  if (!data || !Array.isArray(data)) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("admin.collection")}</th><th>{t("admin.documents")}</th><th>{t("admin.size")}</th><th>{t("admin.indexes")}</th></tr></thead>
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
  const { t } = useTranslation();
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
      alert(err.response?.data?.error || t("admin.updateFailed"));
    }
  };

  const handleReset = async (key) => {
    if (!window.confirm(t("admin.resetConfirm", { key }))) return;
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
      <h3 style={{ marginBottom: "1rem" }}>{t("admin.aiConfig")}</h3>
      <p className="text-sm text-muted mb-1">
        {t("admin.aiConfigDesc")}
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("admin.setting")}</th><th>{t("admin.currentValue")}</th><th>{t("admin.defaultValue")}</th><th></th></tr></thead>
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
                      <button className="btn btn-primary btn-sm" onClick={() => handleSave(row.key)}>{t("common.save")}</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
                    </div>
                  ) : (
                    <span
                      className="text-sm"
                      style={{ cursor: "pointer" }}
                      onClick={() => { setEditing(row.key); setEditValue(String(settings[row.key] || "")); }}
                      title={t("admin.clickToEdit")}
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
                  <button className="btn btn-secondary btn-sm" onClick={() => handleReset(row.key)}>{t("common.reset")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ data, onRefresh }) {
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState(null);
  const [editPlan, setEditPlan] = useState("starter");
  const [trialDays, setTrialDays] = useState(30);
  const [saving, setSaving] = useState(false);

  if (!data) return null;
  const users = data.users || [];

  const handleSavePlan = async (userId) => {
    setSaving(true);
    try {
      await adminApi.updateUserPlan(userId, { plan: editPlan });
      setEditingUser(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t("admin.failedToUpdatePlan"));
    } finally {
      setSaving(false);
    }
  };

  const handleGrantTrial = async (userId) => {
    setSaving(true);
    try {
      await adminApi.updateUserPlan(userId, { grantTrial: true, trialDays });
      setEditingUser(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t("admin.failedToGrantTrial"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("auth.name")}</th><th>{t("auth.email")}</th><th>{t("admin.plan")}</th><th>{t("admin.trial")}</th><th>{t("admin.joined")}</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td className="text-sm">{u.email}</td>
                <td><span className="tag">{u.plan || "starter"}</span></td>
                <td className="text-sm">
                  {u.trialPlan && u.trialEndsAt && new Date(u.trialEndsAt) > new Date() ? (
                    <span className="tag tag-success">
                      {u.trialPlan} until {new Date(u.trialEndsAt).toLocaleDateString()}
                    </span>
                  ) : u.trialUsed ? (
                    <span className="text-muted">{t("common.used")}</span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setEditingUser(editingUser === u._id ? null : u._id); setEditPlan(u.plan || "starter"); }}
                  >
                    {t("common.manage")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (() => {
        const u = users.find((x) => x._id === editingUser);
        if (!u) return null;
        return (
          <div className="card" style={{ marginTop: "1rem", border: "1px solid var(--color-primary)" }}>
            <h4 style={{ marginBottom: "0.75rem" }}>{t("admin.manageUser", { name: u.name, email: u.email })}</h4>

            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {/* Change plan */}
              <div>
                <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>{t("admin.changePlan")}</label>
                <div className="flex gap-sm">
                  <select className="form-control" value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={{ width: "auto" }}>
                    <option value="starter">{t("admin.starterFree")}</option>
                    <option value="coach">{t("admin.coachPlan")}</option>
                    <option value="pro">{t("admin.proPlan")}</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSavePlan(u._id)} disabled={saving}>
                    {saving ? t("common.saving") : t("common.save")}
                  </button>
                </div>
              </div>

              {/* Grant trial */}
              <div>
                <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>{t("admin.grantProTrial")}</label>
                <div className="flex gap-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    min={1}
                    max={365}
                    style={{ width: "80px" }}
                  />
                  <span className="text-sm" style={{ alignSelf: "center" }}>{t("admin.days")}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => handleGrantTrial(u._id)} disabled={saving}>
                    {saving ? t("admin.granting") : t("admin.grantTrial")}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => setEditingUser(null)}>
              {t("common.close")}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function AuditTab({ data }) {
  const { t } = useTranslation();
  if (!data || !Array.isArray(data)) return null;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("admin.time")}</th><th>{t("admin.action")}</th><th>{t("admin.user")}</th><th>{t("admin.ip")}</th><th>{t("admin.details")}</th></tr></thead>
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
              <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>{t("admin.noAuditLogs")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
