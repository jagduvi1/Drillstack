import { useTranslation } from "react-i18next";
import { FiZap, FiLoader } from "react-icons/fi";

/**
 * AI generation panel — prompt form with sport, player count, total minutes,
 * description textarea, and generate / switch-to-manual buttons.
 *
 * Props:
 *   sport            – current sport value from the form
 *   onSportChange    – (value) => void
 *   aiPrompt         – string
 *   onAiPromptChange – (value) => void
 *   aiNumPlayers         – string
 *   onAiNumPlayersChange – (value) => void
 *   aiTotalMinutes         – string
 *   onAiTotalMinutesChange – (value) => void
 *   generating       – boolean
 *   onGenerate       – () => void
 *   onSwitchToManual – () => void
 */
export default function SessionAiPanel({
  sport,
  onSportChange,
  aiPrompt,
  onAiPromptChange,
  aiNumPlayers,
  onAiNumPlayersChange,
  aiTotalMinutes,
  onAiTotalMinutesChange,
  generating,
  onGenerate,
  onSwitchToManual,
}) {
  const { t } = useTranslation();

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
