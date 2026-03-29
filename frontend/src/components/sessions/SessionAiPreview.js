import { useTranslation } from "react-i18next";

/**
 * AI preview panel — shows the AI-generated session plan with accept /
 * regenerate / cancel buttons.
 *
 * Props:
 *   aiPreview        – the suggestion object from the API
 *   aiDrills         – array of available drill objects (used to build drillMap)
 *   onAccept         – () => void   (import the plan into the form)
 *   onRegenerate     – () => void   (clear preview so user can re-prompt)
 *   onCancel         – () => void   (clear preview and switch to manual)
 *   onPreviewDrill   – (drillId) => void  (open drill preview modal)
 */
export default function SessionAiPreview({
  aiPreview,
  aiDrills,
  onAccept,
  onRegenerate,
  onCancel,
  onPreviewDrill,
}) {
  const { t } = useTranslation();

  // Build lookup map from available drills
  const drillMap = {};
  for (const d of aiDrills) {
    drillMap[d.title.toLowerCase()] = d;
  }

  const renderDrillName = (title) => {
    const match = drillMap[title.toLowerCase()];
    if (match) {
      return (
        <button
          type="button"
          className="drill-name-link"
          onClick={() => onPreviewDrill(match._id)}
        >
          {title}
        </button>
      );
    }
    return (
      <span>
        <span style={{ color: "var(--color-danger)", textDecoration: "line-through" }}>
          {title}
        </span>
        <span style={{ color: "var(--color-danger)", fontSize: "0.75rem" }}> ({t("sessions.notInSystem")})</span>
      </span>
    );
  };

  return (
    <div className="card ai-session-panel mb-1">
      <h3 style={{ marginBottom: "0.5rem" }}>{aiPreview.title || t("sessions.aiSessionPlan")}</h3>
      {aiPreview.description && (
        <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
          {aiPreview.description}
        </p>
      )}
      {(aiPreview.blocks || []).map((block, i) => (
        <div key={i} className="ai-preview-block">
          <div className="flex-between">
            <strong className="text-sm">{block.label || block.type}</strong>
            <span className="tag">{block.type}</span>
          </div>
          {block.type === "drills" && block.drillTitles && (
            <div className="text-sm" style={{ marginTop: "0.25rem" }}>
              {block.drillTitles.map((title, j) => (
                <span key={j}>
                  {j > 0 && ", "}
                  {renderDrillName(title)}
                </span>
              ))}
            </div>
          )}
          {block.type === "stations" && (
            <div className="text-sm" style={{ marginTop: "0.25rem" }}>
              <span className="text-muted">{t("sessions.stationInfo", { count: block.stationCount, minutes: block.rotationMinutes })}</span>
              {block.stationDrills && (
                <div style={{ marginTop: "0.25rem" }}>
                  {block.stationDrills.map((s, j) => (
                    <div key={j} style={{ marginLeft: "0.5rem" }}>
                      <span className="text-muted">{t("sessions.station", { number: s.stationNumber })}: </span>
                      {renderDrillName(s.drillTitle || "")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {block.type === "matchplay" && (
            <p className="text-sm text-muted">
              {block.matchDescription} {block.rules && `(${block.rules})`} — {block.duration}{" "}
              min
            </p>
          )}
          {block.type === "break" && (
            <p className="text-sm text-muted">{block.duration} min</p>
          )}
          {block.type === "custom" && block.customContent && (
            <p className="text-sm text-muted">{block.customContent}</p>
          )}
        </div>
      ))}
      <div className="flex gap-sm mt-1">
        <button type="button" className="btn btn-primary" onClick={onAccept}>
          {t("sessions.useThisPlan")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRegenerate}
        >
          {t("sessions.regenerate")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
