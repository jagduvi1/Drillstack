import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiCheck, FiGitBranch } from "react-icons/fi";

export default function DrillVersionsPanel({ versions, currentDrillId, defaultVersionId, onSetDefault, onClose }) {
  const { t } = useTranslation();

  if (!versions) return null;

  return (
    <div className="card mb-1">
      <h3>{t("drills.versions")}</h3>
      <div className="versions-list">
        {versions.versions.map((v) => (
          <div key={v._id} className={`version-item ${v._id === currentDrillId ? "version-item-current" : ""}`}>
            <div className="flex-between">
              <div>
                <Link to={`/drills/${v._id}`}>
                  <strong>v{v.version}</strong>{v.versionName ? ` — ${v.versionName}` : ` — ${v.title}`}
                </Link>
                <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                  by {v.forkedBy?.name || v.createdBy?.name || "Unknown"}
                </span>
              </div>
              <div className="flex gap-sm">
                {defaultVersionId === v._id.toString() ? (
                  <span className="tag tag-success"><FiCheck /> {t("drills.default")}</span>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => onSetDefault(v._id)}>
                    {t("drills.setAsDefault")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
