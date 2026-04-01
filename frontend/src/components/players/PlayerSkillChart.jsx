import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function PlayerSkillChart({ history }) {
  const { t } = useTranslation();

  // Group history by metric, only include numeric ratings
  const metricGroups = useMemo(() => {
    const groups = {};
    for (const h of history) {
      if (typeof h.newValue !== "number") continue;
      if (!groups[h.metric]) groups[h.metric] = [];
      groups[h.metric].push(h);
    }
    return groups;
  }, [history]);

  const availableMetrics = Object.keys(metricGroups);
  const [selectedMetrics, setSelectedMetrics] = useState(() => availableMetrics.slice(0, 4));

  // Build chart data: timeline with all selected metrics
  const chartData = useMemo(() => {
    if (selectedMetrics.length === 0) return [];
    const allEntries = [];
    for (const metric of selectedMetrics) {
      for (const h of metricGroups[metric] || []) {
        allEntries.push({ date: new Date(h.createdAt).getTime(), metric, value: h.newValue });
      }
    }
    // Sort by date and build data points
    allEntries.sort((a, b) => a.date - b.date);

    // Group by date (round to day)
    const byDay = {};
    for (const e of allEntries) {
      const day = new Date(e.date).toLocaleDateString();
      if (!byDay[day]) byDay[day] = { date: day };
      byDay[day][e.metric] = e.value;
    }

    // Forward-fill: carry last known value for each metric
    const days = Object.values(byDay);
    const lastKnown = {};
    for (const day of days) {
      for (const m of selectedMetrics) {
        if (day[m] !== undefined) lastKnown[m] = day[m];
        else if (lastKnown[m] !== undefined) day[m] = lastKnown[m];
      }
    }
    return days;
  }, [selectedMetrics, metricGroups]);

  const toggleMetric = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  if (availableMetrics.length === 0) return null;

  return (
    <div>
      <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{t("playerProfile.progressChart")}</h5>

      {/* Metric selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
        {availableMetrics.map((m, i) => (
          <button key={m} type="button"
            className={`tag ${selectedMetrics.includes(m) ? "" : "tag-muted"}`}
            style={{
              cursor: "pointer", fontSize: "0.65rem",
              opacity: selectedMetrics.includes(m) ? 1 : 0.4,
              borderLeft: `3px solid ${COLORS[i % COLORS.length]}`,
            }}
            onClick={() => toggleMetric(m)}>
            {t(`metrics.${m}`, m)}
          </button>
        ))}
      </div>

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
            {selectedMetrics.map((m, i) => (
              <Line key={m} type="monotone" dataKey={m}
                name={t(`metrics.${m}`, m)}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted">{t("playerProfile.chartNeedsMoreData")}</p>
      )}
    </div>
  );
}
