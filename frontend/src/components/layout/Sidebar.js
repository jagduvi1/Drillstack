import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FiGrid, FiPlay, FiCalendar, FiSearch, FiSettings, FiShield, FiLogOut } from "react-icons/fi";

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="app-sidebar">
      <h2>Training Bank</h2>
      <nav>
        <NavLink to="/" end>
          <FiGrid /> Dashboard
        </NavLink>
        <NavLink to="/drills">
          <FiPlay /> Drills
        </NavLink>
        <NavLink to="/sessions">
          <FiCalendar /> Sessions
        </NavLink>
        <NavLink to="/plans">
          <FiCalendar /> Period Plans
        </NavLink>
        <NavLink to="/search">
          <FiSearch /> Search
        </NavLink>
        <NavLink to="/taxonomy">
          <FiSettings /> Taxonomy
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
