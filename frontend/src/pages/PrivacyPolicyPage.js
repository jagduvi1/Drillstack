import { useTranslation } from "react-i18next";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h1>{t("privacy.title")}</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>{t("privacy.lastUpdated")}</p>

      <div className="card mb-1">
        <h3>{t("privacy.whatWeCollect")}</h3>
        <ul>
          <li><strong>{t("privacy.accountData")}:</strong> {t("privacy.accountDataDesc")}</li>
          <li><strong>{t("privacy.contentData")}:</strong> {t("privacy.contentDataDesc")}</li>
          <li><strong>{t("privacy.playerData")}:</strong> {t("privacy.playerDataDesc")}</li>
          <li><strong>{t("privacy.usageData")}:</strong> {t("privacy.usageDataDesc")}</li>
        </ul>
      </div>

      <div className="card mb-1">
        <h3>{t("privacy.aiProcessing")}</h3>
        <p>{t("privacy.aiProcessingDesc")}</p>
      </div>

      <div className="card mb-1">
        <h3>{t("privacy.yourRights")}</h3>
        <ul>
          <li>{t("privacy.rightAccess")}</li>
          <li>{t("privacy.rightExport")}</li>
          <li>{t("privacy.rightDelete")}</li>
          <li>{t("privacy.rightCorrect")}</li>
          <li>{t("privacy.rightHideEmail")}</li>
        </ul>
      </div>

      <div className="card mb-1">
        <h3>{t("privacy.dataRetention")}</h3>
        <p>{t("privacy.dataRetentionDesc")}</p>
      </div>

      <div className="card mb-1">
        <h3>{t("privacy.security")}</h3>
        <p>{t("privacy.securityDesc")}</p>
      </div>
    </div>
  );
}
