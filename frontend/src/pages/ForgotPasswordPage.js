import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "../api/auth";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      <div className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>{t("auth.forgotPasswordTitle")}</h2>

        {sent ? (
          <>
            <div className="alert alert-success">{t("auth.resetLinkSent")}</div>
            <Link to="/login" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
              {t("auth.backToLogin")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
              {t("auth.forgotPasswordDesc")}
            </p>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t("auth.email")}</label>
                <input
                  className="form-control"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? t("common.loading") : t("auth.sendResetLink")}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-muted mt-1">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
