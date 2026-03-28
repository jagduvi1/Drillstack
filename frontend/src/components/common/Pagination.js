import { useTranslation } from "react-i18next";

export default function Pagination({ page, pages, onPageChange }) {
  const { t } = useTranslation();

  if (!pages || pages <= 1) return null;

  return (
    <div className="flex gap-sm mt-1" style={{ justifyContent: "center" }}>
      <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{t("common.prev")}</button>
      <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
      <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>{t("common.next")}</button>
    </div>
  );
}
