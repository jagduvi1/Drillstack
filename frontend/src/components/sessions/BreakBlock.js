import { useTranslation } from "react-i18next";

export default function BreakBlock({ block, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-sm" style={{ alignItems: "center" }}>
      <label className="text-sm">{t("blocks.durationLabel")}</label>
      <input
        type="number"
        className="form-control form-control-sm"
        value={block.duration || 0}
        onChange={(e) =>
          onChange({ ...block, duration: parseInt(e.target.value, 10) || 0 })
        }
        min={0}
        style={{ width: 80 }}
      />
      <span className="text-sm text-muted">{t("common.minutes")}</span>
      <input
        className="form-control form-control-sm"
        placeholder={t("blocks.notesOptional")}
        value={block.notes || ""}
        onChange={(e) => onChange({ ...block, notes: e.target.value })}
        style={{ flex: 1 }}
      />
    </div>
  );
}
