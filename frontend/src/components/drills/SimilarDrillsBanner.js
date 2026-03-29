import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiGitBranch, FiLink, FiTrash2 } from "react-icons/fi";

export default function SimilarDrillsBanner({ similarDrills, onConvertToVersion, onDismiss, onDiscard }) {
  const { t } = useTranslation();

  if (!similarDrills || similarDrills.length === 0) return null;

  return (
    <div className="card mb-1 similar-drills-banner">
      <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
        <FiLink style={{ marginTop: "0.2rem", flexShrink: 0, color: "var(--color-primary)" }} />
        <div style={{ flex: 1 }}>
          <strong>{t("drills.similarDrillsExist")}</strong>
          <p className="text-sm text-muted" style={{ margin: "0.25rem 0 0.75rem" }}>
            {t("drills.similarDrillsDesc")}
          </p>
          {similarDrills.map((s) => (
            <div key={s._id} className="similar-drill-item">
              <div style={{ flex: 1 }}>
                <Link to={`/drills/${s._id}`}>
                  <strong>{s.title}</strong>
                </Link>
                <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>
                  {t("drills.similar", { pct: Math.round(s.similarity * 100) })}
                </span>
                {s.description && (
                  <p className="text-sm text-muted" style={{ margin: "0.15rem 0 0" }}>
                    {s.description.slice(0, 100)}{s.description.length > 100 ? "..." : ""}
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onConvertToVersion(s._id)}
              >
                <FiGitBranch /> {t("drills.addAsVersion")}
              </button>
            </div>
          ))}
          <div className="flex gap-sm mt-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={onDismiss}
            >
              {t("drills.keepAsSeparate")}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={onDiscard}
            >
              <FiTrash2 /> {t("drills.discardMyDrill")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
