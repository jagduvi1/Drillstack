import { useTranslation } from "react-i18next";

export default function CustomBlock({ block, onChange }) {
  const { t } = useTranslation();
  const set = (field, value) => onChange({ ...block, [field]: value });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem" }}>
        <div className="form-group">
          <label className="text-sm">{t("blocks.content")}</label>
          <textarea
            className="form-control form-control-sm"
            placeholder={t("blocks.contentPlaceholder")}
            value={block.customContent || ""}
            onChange={(e) => set("customContent", e.target.value)}
            style={{ minHeight: 60 }}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">{t("blocks.durationMin")}</label>
          <input
            type="number"
            className="form-control form-control-sm"
            value={block.duration || 0}
            onChange={(e) => set("duration", parseInt(e.target.value, 10) || 0)}
            min={0}
            style={{ width: 80 }}
          />
        </div>
      </div>
      <div className="form-group">
        <input
          className="form-control form-control-sm"
          placeholder={t("blocks.notesOptional")}
          value={block.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
