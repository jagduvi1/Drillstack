import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updatePlayerMetrics } from "../../api/players";
import { FiSave, FiCheck } from "react-icons/fi";

export default function PlayerMetricsEditor({ groupId, playerId, metrics, metricKeys, onSaved }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => {
    const v = {};
    for (const key of metricKeys) v[key] = metrics[key] ?? 50;
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

  return (
    <div>
      <div className="metrics-grid">
        {metricKeys.map((key) => (
          <div key={key} className="metric-row">
            <label className="metric-label">{t(`metrics.${key}`, key)}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={values[key] || 0}
              onChange={(e) => setValues((v) => ({ ...v, [key]: parseInt(e.target.value, 10) }))}
              className="metric-slider"
            />
            <span className="metric-value">{values[key]}</span>
          </div>
        ))}
      </div>
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
