import { useState } from "react";
import { useApi } from "./helpers";
import { getAISettings, updateAISetting, resetAISetting } from "../../api/superadmin";

export default function TabAI() {
  const { data, loading, error, reload } = useApi(getAISettings);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (loading) return <div className="sa-loading">Loading AI configuration...</div>;
  if (error) return <div className="sa-error">Error: {error}</div>;
  if (!data) return null;

  const settings = data.settings || {};
  const defaults = data.defaults || {};

  const handleSave = async (key) => {
    try {
      let value = editValue;
      if (key === "embedding_dimensions") value = parseInt(value, 10);
      await updateAISetting(key, value);
      setEditing(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const handleReset = async (key) => {
    if (!window.confirm(`Reset "${key}" to default value?`)) return;
    await resetAISetting(key);
    reload();
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
    <div className="sa-panel">
      <div className="sa-panel-header">
        <span className="sa-panel-title">AI & Embedding Configuration</span>
        <button className="sa-btn" onClick={reload}>Refresh</button>
      </div>
      <div className="sa-panel-body">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Setting</th><th>Current Value</th><th>Default</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key}>
                  <td>
                    <div style={{ color: "var(--sa-accent2)", fontSize: 12 }}>{row.label}</div>
                    <div style={{ color: "var(--sa-text-dim)", fontSize: 10 }}>{row.hint}</div>
                  </td>
                  <td>
                    {editing === row.key ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {row.key === "ai_system_prompt" ? (
                          <textarea className="sa-input" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ minHeight: 60, minWidth: 250 }} />
                        ) : (
                          <input className="sa-input" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ minWidth: 200 }} />
                        )}
                        <button className="sa-btn" onClick={() => handleSave(row.key)}>Save</button>
                        <button className="sa-btn" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span
                        style={{ cursor: "pointer", color: "var(--sa-text)" }}
                        onClick={() => { setEditing(row.key); setEditValue(String(settings[row.key] || "")); }}
                        title="Click to edit"
                      >
                        {row.key === "ai_system_prompt"
                          ? (settings[row.key] || "").slice(0, 80) + "..."
                          : String(settings[row.key] || "—")}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--sa-text-dim)" }}>
                    {row.key === "ai_system_prompt"
                      ? (defaults[row.key] || "").slice(0, 40) + "..."
                      : String(defaults[row.key] || "—")}
                  </td>
                  <td>
                    <button className="sa-btn" onClick={() => handleReset(row.key)}>Reset</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
