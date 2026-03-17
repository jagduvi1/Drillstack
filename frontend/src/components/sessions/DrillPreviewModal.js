import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getDrill } from "../../api/drills";
import { FiX, FiLoader } from "react-icons/fi";

export default function DrillPreviewModal({ drillId, onClose }) {
  const { t } = useTranslation();
  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!drillId) return;
    setLoading(true);
    setError("");
    getDrill(drillId)
      .then((res) => setDrill(res.data))
      .catch(() => setError(t("picker.failedToLoadDrill")))
      .finally(() => setLoading(false));
  }, [drillId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{drill?.title || t("picker.drillDetails")}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {loading ? (
          <div className="loading"><FiLoader className="spin" /> {t("common.loading")}</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : drill ? (
          <div className="drill-preview-body">
            {drill.description && (
              <p style={{ marginBottom: "1rem" }}>{drill.description}</p>
            )}

            <div className="flex gap-sm" style={{ flexWrap: "wrap", marginBottom: "1rem" }}>
              {drill.sport && <span className="tag">{drill.sport}</span>}
              {drill.intensity && (
                <span className={`tag tag-${drill.intensity === "high" ? "danger" : drill.intensity === "low" ? "" : "warning"}`}>
                  {drill.intensity}
                </span>
              )}
              {drill.setup?.duration && <span className="tag">{drill.setup.duration}</span>}
              {drill.setup?.players && <span className="tag">{drill.setup.players}</span>}
            </div>

            {drill.setup?.space && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("drills.space")}</strong>{" "}
                <span className="text-sm">{drill.setup.space}</span>
              </div>
            )}

            {drill.setup?.equipment?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("drills.equipment")}</strong>{" "}
                <span className="text-sm">{drill.setup.equipment.join(", ")}</span>
              </div>
            )}

            {drill.howItWorks && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("picker.howItWorks")}</strong>
                <p className="text-sm" style={{ marginTop: "0.25rem", whiteSpace: "pre-line" }}>
                  {drill.howItWorks}
                </p>
              </div>
            )}

            {drill.coachingPoints?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("picker.coachingPoints")}</strong>
                <ul className="text-sm" style={{ marginTop: "0.25rem", paddingLeft: "1.25rem" }}>
                  {drill.coachingPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {drill.variations?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("drills.variations")}</strong>
                <ul className="text-sm" style={{ marginTop: "0.25rem", paddingLeft: "1.25rem" }}>
                  {drill.variations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}

            {drill.diagrams?.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <strong className="text-sm">{t("picker.diagram")}</strong>
                <div style={{ marginTop: "0.25rem" }}>
                  <img
                    src={drill.diagrams[0].url}
                    alt="Drill diagram"
                    style={{ maxWidth: "100%", borderRadius: "var(--radius)" }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
