import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiLoader, FiRefreshCw } from "react-icons/fi";

export default function DrillEmbeddingStatus({ drill, embeddingElapsed, isAdmin, onRetry }) {
  const { t } = useTranslation();

  if (!drill.embeddingStatus || drill.embeddingStatus === "indexed") return null;

  return (
    <div className="embedding-progress-detail mb-1">
      {drill.embeddingStatus === "failed" ? (
        <div className="flex-between">
          <span>
            <FiAlertCircle style={{ color: "var(--color-danger)" }} /> {t("drills.searchIndexingFailed")}{isAdmin && drill.embeddingError ? `: ${drill.embeddingError}` : ""}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>
            <FiRefreshCw /> {t("drills.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex-between">
            <span>
              <FiLoader className="spin" />{" "}
              {drill.embeddingStatus === "pending"
                ? t("drills.queuedForIndexing")
                : t("drills.indexingForSearch")
              }
            </span>
            <span className="text-sm text-muted embedding-timer">
              {embeddingElapsed > 0 && `${embeddingElapsed}s`}
              {embeddingElapsed < 25 && ` · ~${Math.max(0, 25 - embeddingElapsed)}s remaining`}
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: "0.5rem" }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(95, (embeddingElapsed / 25) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted" style={{ marginTop: "0.35rem" }}>
            {t("drills.freeTierNote")}
          </p>
        </>
      )}
    </div>
  );
}
