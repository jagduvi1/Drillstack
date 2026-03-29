import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { verifyEmail, resendVerification } from "../api/auth";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "loading" : "noToken");
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setError(err.response?.data?.error || t("auth.emailVerificationFailed"));
        setStatus("error");
      });
  }, [token, t]);

  const handleResend = async () => {
    setResendStatus("");
    try {
      await resendVerification();
      setResendStatus(t("auth.verificationSent"));
    } catch (err) {
      setResendStatus(err.response?.data?.error || t("auth.emailVerificationFailed"));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      <div className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>{t("auth.verifyEmailTitle")}</h2>

        {status === "loading" && <p>{t("auth.verifyingEmail")}</p>}

        {status === "success" && (
          <>
            <div className="alert alert-success">{t("auth.emailVerified")}</div>
            <Link to="/login" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
              {t("auth.signIn")}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="alert alert-danger">{error}</div>
            <button className="btn btn-primary" onClick={handleResend} style={{ width: "100%" }}>
              {t("auth.resendVerification")}
            </button>
            {resendStatus && <p className="text-sm text-muted mt-1">{resendStatus}</p>}
          </>
        )}

        {status === "noToken" && (
          <>
            <p>{t("auth.checkYourEmail")}</p>
            <button className="btn btn-primary" onClick={handleResend} style={{ width: "100%" }}>
              {t("auth.resendVerification")}
            </button>
            {resendStatus && <p className="text-sm text-muted mt-1">{resendStatus}</p>}
          </>
        )}

        <p className="text-sm text-muted mt-1">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
