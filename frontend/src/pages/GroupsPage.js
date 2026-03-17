import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroups } from "../context/GroupContext";
import { deleteGroup } from "../api/groups";
import { FiPlus, FiUsers, FiTrash2, FiEdit, FiShield, FiUser } from "react-icons/fi";

export default function GroupsPage() {
  const { t } = useTranslation();
  const { groups, loading, refreshGroups } = useGroups();

  const clubs = groups.filter((g) => g.type === "club");
  const teams = groups.filter((g) => g.type === "team");
  const teamsUnderClubs = teams.filter((t) => t.parentClub);
  const standaloneTeams = teams.filter((t) => !t.parentClub);

  const handleDelete = async (id) => {
    if (!window.confirm(t("groups.deleteGroup"))) return;
    await deleteGroup(id);
    refreshGroups();
  };

  const getTeamsForClub = (clubId) => teamsUnderClubs.filter((t) =>
    (t.parentClub?._id || t.parentClub) === clubId
  );

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{t("groups.title")}</h1>
        <Link to="/groups/new" className="btn btn-primary"><FiPlus /> {t("groups.newGroup")}</Link>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <FiUsers style={{ fontSize: "2rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
          <p className="text-muted">{t("groups.noGroups")}</p>
          <Link to="/groups/new" className="btn btn-primary mt-1"><FiPlus /> {t("groups.createGroup")}</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Standalone teams (not under any club) */}
          {standaloneTeams.map((team) => (
            <div key={team._id} className="card">
              <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                <Link to={`/groups/${team._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiUsers style={{ color: "var(--color-primary)" }} />
                    {team.name}
                  </h3>
                </Link>
                <div className="flex gap-sm">
                  {team.sport && <span className="tag">{team.sport}</span>}
                  <span className="tag">{t("groups.team")}</span>
                  <span className="tag"><FiUsers style={{ fontSize: "0.7rem" }} /> {team.members?.length || 0}</span>
                </div>
              </div>
              {team.description && (
                <p className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>{team.description}</p>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link to={`/groups/${team._id}`} className="btn btn-secondary btn-sm"><FiEdit /> {t("common.manage")}</Link>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(team._id)}><FiTrash2 /></button>
              </div>
            </div>
          ))}

          {/* Clubs with their teams */}
          {clubs.map((club) => {
            const clubTeams = getTeamsForClub(club._id);
            return (
              <div key={club._id} className="card">
                <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                  <Link to={`/groups/${club._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FiShield style={{ color: "var(--color-primary)" }} />
                      {club.name}
                    </h3>
                  </Link>
                  <div className="flex gap-sm">
                    {club.sport && <span className="tag">{club.sport}</span>}
                    <span className="tag">{t("groups.club")}</span>
                    <span className="tag"><FiUsers style={{ fontSize: "0.7rem" }} /> {club.members?.length || 0}</span>
                  </div>
                </div>
                {club.description && (
                  <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>{club.description}</p>
                )}

                {clubTeams.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <p className="text-sm" style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t("groups.teams")}</p>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {clubTeams.map((team) => (
                        <Link key={team._id} to={`/groups/${team._id}`}
                          style={{ background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem", textDecoration: "none", color: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <FiUser /> {team.name}
                          </span>
                          <span className="tag"><FiUsers style={{ fontSize: "0.7rem" }} /> {team.members?.length || 0}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <Link to={`/groups/${club._id}`} className="btn btn-secondary btn-sm"><FiEdit /> {t("common.manage")}</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(club._id)}><FiTrash2 /></button>
                </div>
              </div>
            );
          })}

          {/* Teams under clubs the user doesn't directly belong to */}
          {teamsUnderClubs.filter((t) => !clubs.some((c) => c._id === (t.parentClub?._id || t.parentClub))).map((team) => (
            <div key={team._id} className="card">
              <div className="flex-between">
                <Link to={`/groups/${team._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiUser /> {team.name}
                  </h3>
                </Link>
                <div className="flex gap-sm">
                  {team.sport && <span className="tag">{team.sport}</span>}
                  <span className="tag"><FiUsers style={{ fontSize: "0.7rem" }} /> {team.members?.length || 0}</span>
                </div>
              </div>
              {team.parentClub?.name && (
                <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{t("groups.club")}: {team.parentClub.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
