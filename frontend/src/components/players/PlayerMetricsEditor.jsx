import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updatePlayerMetrics } from "../../api/players";
import { SKILL_LEVELS } from "../../constants/sportMetrics";
import { FiSave, FiCheck } from "react-icons/fi";

export default function PlayerMetricsEditor({ groupId, playerId, metrics, metricDefs, onSaved }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => {
    const v = {};
    for (const def of metricDefs) {
      const existing = metrics[def.key];
      if (def.type === "cert") v[def.key] = existing ?? false;
      else if (def.type === "level") v[def.key] = existing ?? "";
      else v[def.key] = existing ?? 50;
    }
    return v;
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePlayerMetrics(groupId, playerId, { ratings: values, note });
      onSaved?.(res.data);
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const ratings = metricDefs.filter((d) => d.type === "rating");
  const levels = metricDefs.filter((d) => d.type === "level");
  const certs = metricDefs.filter((d) => d.type === "cert");

  return (
    <div>
      {/* Certifications */}
      {certs.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{t("playerProfile.certifications")}</h5>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {certs.map((def) => (
              <label key={def.key} style={{
                display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer",
                padding: "0.35rem 0.6rem", borderRadius: "var(--radius)", fontSize: "0.8rem",
                background: values[def.key] ? "rgba(34, 197, 94, 0.15)" : "var(--color-bg)",
                border: `1px solid ${values[def.key] ? "var(--color-success, #22c55e)" : "var(--color-border)"}`,
              }}>
                <input type="checkbox" checked={!!values[def.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.checked }))} />
                {def.name || t(`metrics.${def.key}`, def.key)}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Levels */}
      {levels.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{t("playerProfile.skillLevels")}</h5>
          {levels.map((def) => (
            <div key={def.key} className="metric-row" style={{ marginBottom: "0.35rem" }}>
              <label className="metric-label">{def.name || t(`metrics.${def.key}`, def.key)}</label>
              <select className="form-control form-control-sm" value={values[def.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value }))}
                style={{ width: "auto", minWidth: 140 }}>
                <option value="">—</option>
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>{t(`skillLevels.${l}`, l)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Ratings (0-100 sliders) */}
      {ratings.length > 0 && (
        <div>
          {(certs.length > 0 || levels.length > 0) && (
            <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{t("playerProfile.skillRatings")}</h5>
          )}
          <div className="metrics-grid">
            {ratings.map((def) => (
              <div key={def.key} className="metric-row">
                <label className="metric-label">{def.name || t(`metrics.${def.key}`, def.key)}</label>
                <input
                  type="range" min={0} max={100}
                  value={values[def.key] || 0}
                  onChange={(e) => setValues((v) => ({ ...v, [def.key]: parseInt(e.target.value, 10) }))}
                  className="metric-slider"
                />
                <span className="metric-value">{values[def.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          className="form-control form-control-sm"
          placeholder={t("playerProfile.assessmentNote")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saved ? <><FiCheck /> {t("settings.saved")}</> : <><FiSave /> {saving ? "..." : t("common.save")}</>}
        </button>
      </div>
    </div>
  );
}
