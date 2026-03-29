import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../api/auth";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      <div className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>{t("auth.resetPasswordTitle")}</h2>

        {success ? (
          <>
            <div className="alert alert-success">{t("auth.passwordResetSuccess")}</div>
            <Link to="/login" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
              {t("auth.signIn")}
            </Link>
          </>
        ) : (
          <>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t("auth.newPassword")}</label>
                <input
                  className="form-control"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t("auth.confirmPassword")}</label>
                <input
                  className="form-control"
                  type="password"
                  required
                  minLength={6}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </div>
              <button className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? t("common.loading") : t("auth.resetPassword")}
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
