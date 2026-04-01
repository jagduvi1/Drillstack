import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiZap, FiLoader, FiChevronDown, FiChevronUp } from "react-icons/fi";

const COMMON_EQUIPMENT = [
  "mats", "cones", "hoops", "balls", "ropes", "benches", "goals",
  "bibs", "ladders", "hurdles", "rings", "balance_beam", "vault",
  "trampoline", "bars", "springboard", "crash_mats", "foam_pit",
  "resistance_bands", "medicine_balls",
];

export default function SessionAiPanel({
  sport,
  onSportChange,
  aiPrompt,
  onAiPromptChange,
  aiNumPlayers,
  onAiNumPlayersChange,
  aiTotalMinutes,
  onAiTotalMinutesChange,
  aiAdvanced,
  onAiAdvancedChange,
  generating,
  onGenerate,
  onSwitchToManual,
}) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const adv = aiAdvanced || {};

  const updateAdv = (field, value) => {
    onAiAdvancedChange?.({ ...adv, [field]: value });
  };

  const toggleEquipment = (item) => {
    const unavailable = new Set(adv.unavailableEquipment || []);
    if (unavailable.has(item)) unavailable.delete(item);
    else unavailable.add(item);
    updateAdv("unavailableEquipment", [...unavailable]);
  };

  const unavailableSet = new Set(adv.unavailableEquipment || []);

  return (
    <div className="card ai-session-panel mb-1">
      <h3 style={{ marginBottom: "0.75rem" }}>{t("sessions.describeSession")}</h3>
      <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
        {t("sessions.describeSessionHint")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group">
          <label className="text-sm">{t("sessions.sportLabel")}</label>
          <input
            className="form-control"
            placeholder={t("sessions.sportPlaceholder")}
            value={sport}
            onChange={(e) => onSportChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">{t("sessions.numberOfPlayers")}</label>
          <input
            className="form-control"
            type="number"
            placeholder="e.g. 16"
            value={aiNumPlayers}
            onChange={(e) => onAiNumPlayersChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">{t("sessions.totalTime")}</label>
          <input
            className="form-control"
            type="number"
            placeholder="e.g. 90"
            value={aiTotalMinutes}
            onChange={(e) => onAiTotalMinutesChange(e.target.value)}
          />
        </div>
      </div>

      <textarea
        className="form-control"
        placeholder={t("sessions.sessionDescPlaceholder")}
        value={aiPrompt}
        onChange={(e) => onAiPromptChange(e.target.value)}
        style={{ minHeight: 100 }}
      />

      {/* Advanced options */}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{ marginTop: "0.5rem", color: "var(--color-muted)", background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer" }}
      >
        {showAdvanced ? <FiChevronUp /> : <FiChevronDown />} {t("sessions.advancedOptions")}
      </button>

      {showAdvanced && (
        <div className="ai-advanced-section" style={{ marginTop: "0.5rem", padding: "0.75rem", background: "var(--color-bg)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="text-sm">{t("sessions.groupType")}</label>
              <select className="form-control" value={adv.groupType || ""}
                onChange={(e) => updateAdv("groupType", e.target.value)}>
                <option value="">—</option>
                <option value="children">{t("sessions.groupTypes.children")}</option>
                <option value="team">{t("sessions.groupTypes.team")}</option>
                <option value="beginners">{t("sessions.groupTypes.beginners")}</option>
                <option value="advanced">{t("sessions.groupTypes.advanced")}</option>
                <option value="competitive">{t("sessions.groupTypes.competitive")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="text-sm">{t("sessions.ageRange")}</label>
              <input className="form-control" placeholder="e.g. 8-10"
                value={adv.ageRange || ""} onChange={(e) => updateAdv("ageRange", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="text-sm">{t("sessions.numberOfCoaches")}</label>
              <input className="form-control" type="number" placeholder="e.g. 2" min={1}
                value={adv.numCoaches || ""} onChange={(e) => updateAdv("numCoaches", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
            <div className="form-group">
              <label className="text-sm">{t("sessions.spaceConstraint")}</label>
              <select className="form-control" value={adv.spaceConstraint || ""}
                onChange={(e) => updateAdv("spaceConstraint", e.target.value)}>
                <option value="">—</option>
                <option value="full_hall">{t("sessions.spaces.fullHall")}</option>
                <option value="half_hall">{t("sessions.spaces.halfHall")}</option>
                <option value="quarter_hall">{t("sessions.spaces.quarterHall")}</option>
                <option value="outdoor">{t("sessions.spaces.outdoor")}</option>
                <option value="small_room">{t("sessions.spaces.smallRoom")}</option>
              </select>
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.3rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
                <input type="checkbox" checked={!!adv.hasCertification}
                  onChange={(e) => updateAdv("hasCertification", e.target.checked)} />
                {t("sessions.hasCertification")}
              </label>
            </div>
          </div>

          {/* Equipment availability */}
          <div style={{ marginTop: "0.75rem" }}>
            <label className="text-sm" style={{ fontWeight: 600, marginBottom: "0.35rem", display: "block" }}>
              {t("sessions.equipmentAvailability")}
            </label>
            <p className="text-xs text-muted" style={{ marginBottom: "0.35rem" }}>
              {t("sessions.equipmentHint")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {COMMON_EQUIPMENT.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`tag ${unavailableSet.has(item) ? "tag-unavailable" : "tag-available"}`}
                  onClick={() => toggleEquipment(item)}
                  style={{ cursor: "pointer", fontSize: "0.7rem", opacity: unavailableSet.has(item) ? 0.4 : 1, textDecoration: unavailableSet.has(item) ? "line-through" : "none" }}
                >
                  {t(`equipment.${item}`, item)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-sm mt-1">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={generating || !aiPrompt.trim()}
        >
          {generating ? (
            <><FiLoader className="spin" /> {t("sessions.generating")}</>
          ) : (
            <><FiZap /> {t("sessions.generateSession")}</>
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSwitchToManual}
        >
          {t("sessions.switchToManual")}
        </button>
      </div>
    </div>
  );
}
