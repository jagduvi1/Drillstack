import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createGroup } from "../api/groups";
import { getUsage } from "../api/billing";
import { useGroups } from "../context/GroupContext";
import { FiSave, FiX, FiUsers, FiShield, FiLock } from "react-icons/fi";

export default function GroupFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshGroups } = useGroups();
  const [form, setForm] = useState({ name: "", description: "", sport: "", type: "team" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [effectivePlan, setEffectivePlan] = useState("starter");

  useEffect(() => {
    getUsage().then((res) => setEffectivePlan(res.data.effectivePlan || "starter")).catch(() => {});
  }, []);

  const canCreateGroup = effectivePlan !== "starter";
  const canCreateClub = effectivePlan === "pro";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createGroup(form);
      refreshGroups();
      navigate("/groups");
    } catch (err) {
      setError(err.response?.data?.error || t("groups.failedToCreate"));
    } finally {
      setLoading(false);
    }
  };

  const isClub = form.type === "club";

  if (!canCreateGroup) {
    return (
      <div>
        <h1>{t("groups.createGroup")}</h1>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <FiLock style={{ fontSize: "2rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
          <h2 style={{ marginBottom: "0.5rem" }}>{t("groups.upgradeToCreate")}</h2>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            {t("groups.upgradeDesc")}
          </p>
          <Link to="/pricing" className="btn btn-primary">{t("groups.viewPlans")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("groups.createGroup")}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-1">
          {/* Type selector */}
          <div className="form-group">
            <label>{t("groups.type")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button type="button"
                onClick={() => setForm({ ...form, type: "team" })}
                style={{
                  padding: "1rem", borderRadius: "var(--radius)", cursor: "pointer",
                  border: `2px solid ${!isClub ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: !isClub ? "var(--color-primary-light, #eef2ff)" : "var(--color-card)",
                  textAlign: "center", color: "var(--color-text)",
                }}>
                <FiUsers style={{ fontSize: "1.5rem", marginBottom: "0.25rem", display: "block", margin: "0 auto 0.25rem" }} />
                <strong>{t("groups.team")}</strong>
                <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                  {t("groups.teamDesc")}
                </p>
              </button>
              <button type="button"
                onClick={canCreateClub ? () => setForm({ ...form, type: "club" }) : undefined}
                style={{
                  padding: "1rem", borderRadius: "var(--radius)",
                  cursor: canCreateClub ? "pointer" : "not-allowed",
                  opacity: canCreateClub ? 1 : 0.5,
                  border: `2px solid ${isClub ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: isClub ? "var(--color-primary-light, #eef2ff)" : "var(--color-card)",
                  textAlign: "center", color: "var(--color-text)",
                }}>
                <FiShield style={{ fontSize: "1.5rem", marginBottom: "0.25rem", display: "block", margin: "0 auto 0.25rem" }} />
                <strong>{t("groups.club")}</strong>
                {canCreateClub ? (
                  <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                    {t("groups.clubDesc")}
                  </p>
                ) : (
                  <p className="text-sm" style={{ marginTop: "0.25rem", color: "var(--color-warning)" }}>
                    <FiLock style={{ fontSize: "0.75rem" }} /> {t("groups.requiresPro")}
                  </p>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>{isClub ? t("groups.clubName") : t("groups.teamName")}</label>
            <input className="form-control" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isClub ? t("groups.clubPlaceholder") : t("groups.teamPlaceholder")} />
          </div>
          <div className="form-group">
            <label>{t("sessions.description")}</label>
            <textarea className="form-control" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={isClub ? t("groups.clubDescPlaceholder") : t("groups.teamDescPlaceholder")} style={{ minHeight: 60 }} />
          </div>
          <div className="form-group">
            <label>{t("drills.sport")}</label>
            <input className="form-control" value={form.sport}
              onChange={(e) => setForm({ ...form, sport: e.target.value })}
              placeholder={t("drills.sportEg")} />
          </div>
        </div>

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? t("auth.creating") : isClub ? t("groups.createClub") : t("groups.createTeam")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/groups")}>
            <FiX /> {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
