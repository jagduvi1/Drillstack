import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getUnreadCount } from "../../api/notifications";
import { FiGrid, FiZap, FiCalendar, FiSearch, FiShield, FiLogOut, FiBell } from "react-icons/fi";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const check = () => {
      getUnreadCount()
        .then((res) => { if (mounted) setUnread(res.data.count); })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 30000); // poll every 30s
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <aside className="app-sidebar">
      <h2>DrillStack</h2>
      <nav>
        <NavLink to="/" end>
          <FiGrid /> Dashboard
        </NavLink>
        <NavLink to="/drills">
          <FiZap /> Drills
        </NavLink>
        <NavLink to="/sessions">
          <FiCalendar /> Sessions
        </NavLink>
        <NavLink to="/plans">
          <FiCalendar /> Plans
        </NavLink>
        <NavLink to="/search">
          <FiSearch /> Search
        </NavLink>
        <NavLink to="/notifications" className="nav-notifications">
          <FiBell /> Notifications
          {unread > 0 && <span className="notification-badge">{unread}</span>}
        </NavLink>
        {user?.isSuperAdmin && (
          <NavLink to="/superadmin">
            <FiShield /> Super Admin
          </NavLink>
        )}
      </nav>
      <div style={{ padding: "1rem", borderTop: "1px solid var(--color-border)" }}>
        <div className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
          {user?.name}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          <FiLogOut /> Logout
        </button>
      </div>
    </aside>
  );
}
