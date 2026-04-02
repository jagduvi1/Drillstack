import { useTranslation } from "react-i18next";

function getColor(score) {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#3b82f6"; // blue
  if (score >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export default function MatchScoreBar({ score, feedback }) {
  const { t } = useTranslation();

  if (score == null) return null;

  const color = getColor(score);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          backgroundColor: "var(--color-surface, #e5e7eb)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 5,
            backgroundColor: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontWeight: 600, color, minWidth: 40, textAlign: "right" }}>
        {score}%
      </span>
      {feedback && (
        <span style={{ fontSize: "0.85em", color: "var(--color-text-secondary, #6b7280)" }}>
          {t(`matchScore.${feedback.toLowerCase().replace(/\s+/g, "_")}`, feedback)}
        </span>
      )}
    </div>
  );
}
