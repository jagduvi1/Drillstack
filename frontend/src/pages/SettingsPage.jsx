import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { updatePreferences } from "../api/auth";
import { SPORT_GROUPS } from "../components/tactics/sportConfigs";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [preferredSport, setPreferredSport] = useState(user?.preferredSport || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await updatePreferences({ name, preferredSport });
      updateUser(res.data.user);
      setMsg(t("settings.saved"));
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem" }}>
      <h1>{t("settings.title")}</h1>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>{t("settings.name")}</label>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>{t("settings.preferredSport")}</label>
          <select
            className="form-control"
            value={preferredSport}
            onChange={(e) => setPreferredSport(e.target.value)}
          >
            <option value="">{t("settings.none")}</option>
            {SPORT_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {t(`tactics.sports.${g.key}`, g.label)}
              </option>
            ))}
          </select>
          <small className="text-muted">{t("settings.preferredSportHelp")}</small>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ marginTop: "1rem" }}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {msg && <span className="text-sm text-muted" style={{ marginLeft: "0.75rem" }}>{msg}</span>}
      </form>
    </div>
  );
}
