import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useGroups } from "../../context/GroupContext";
import { getUnreadCount } from "../../api/notifications";
import { getUsage } from "../../api/billing";
import { FiGrid, FiZap, FiCalendar, FiSearch, FiShield, FiLogOut, FiBell, FiPlay, FiUsers, FiChevronDown, FiCreditCard, FiTarget } from "react-icons/fi";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { groups, activeGroup, setActiveGroup } = useGroups();
  const [unread, setUnread] = useState(0);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    let mounted = true;
    const check = () => {
      getUnreadCount()
        .then((res) => { if (mounted) setUnread(res.data.count); })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    getUsage()
      .then((res) => setPlanName(res.data.planName || ""))
      .catch(() => {});
  }, []);

  return (
    <aside className="app-sidebar">
      <h2>{t("common.appName")}</h2>

      {/* Group context switcher */}
      {groups.length > 0 && (
        <div className="sidebar-group-switcher" style={{ padding: "0 1rem", marginBottom: "0.5rem" }}>
          <button
            className="group-switcher-btn"
            onClick={() => setShowGroupPicker(!showGroupPicker)}
            style={{
              width: "100%", background: "var(--color-bg)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: "0.8rem", color: "var(--color-text)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeGroup ? activeGroup.name : t("common.personal")}
            </span>
            <FiChevronDown style={{ flexShrink: 0 }} />
          </button>

          {showGroupPicker && (
            <div style={{
              background: "var(--color-card)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)", marginTop: "0.25rem", overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)", position: "relative", zIndex: 10,
            }}>
              <button
                onClick={() => { setActiveGroup(null); setShowGroupPicker(false); }}
                style={{
                  width: "100%", padding: "0.5rem 0.75rem", border: "none", background: !activeGroup ? "var(--color-bg)" : "transparent",
                  cursor: "pointer", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text)",
                }}
              >
                {t("common.personal")}
              </button>
              {groups.map((g) => (
                <button
                  key={g._id}
                  onClick={() => { setActiveGroup(g._id); setShowGroupPicker(false); }}
                  style={{
                    width: "100%", padding: "0.5rem 0.75rem", border: "none",
                    background: activeGroup?._id === g._id ? "var(--color-bg)" : "transparent",
                    cursor: "pointer", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text)",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  {g.parentClub ? `  ${g.name}` : g.name}
                  {g.parentClub?.name ? ` (${g.parentClub.name})` : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav>
        <NavLink to="/today">
          <FiPlay /> {t("nav.today")}
        </NavLink>
        <NavLink to="/" end>
          <FiGrid /> {t("nav.dashboard")}
        </NavLink>
        <NavLink to="/drills">
          <FiZap /> {t("nav.drills")}
        </NavLink>
        <NavLink to="/sessions">
          <FiCalendar /> {t("nav.sessions")}
        </NavLink>
        <NavLink to="/plans">
          <FiCalendar /> {t("nav.plans")}
        </NavLink>
        <NavLink to="/tactics">
          <FiTarget /> {t("nav.tactics")}
        </NavLink>
        <NavLink to="/groups">
          <FiUsers /> {t("nav.groups")}
        </NavLink>
        <NavLink to="/search">
          <FiSearch /> {t("nav.search")}
        </NavLink>
        <NavLink to="/pricing">
          <FiCreditCard /> {t("nav.pricing")}
          {planName && <span className="tag" style={{ marginLeft: "auto", fontSize: "0.65rem" }}>{planName}</span>}
        </NavLink>
        <NavLink to="/notifications" className="nav-notifications">
          <FiBell /> {t("nav.notifications")}
          {unread > 0 && <span className="notification-badge">{unread}</span>}
        </NavLink>
        {user?.isSuperAdmin && (
          <NavLink to="/superadmin">
            <FiShield /> {t("nav.superAdmin")}
          </NavLink>
        )}
      </nav>
      <div style={{ padding: "0.5rem 1rem" }}>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="form-control"
          style={{ fontSize: "0.8rem" }}
        >
          <option value="en">{t("language.en")}</option>
          <option value="sv">{t("language.sv")}</option>
        </select>
      </div>
      <div className="sidebar-user" style={{ padding: "1rem", borderTop: "1px solid var(--color-border)" }}>
        <div className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
          {user?.name}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          <FiLogOut /> {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
