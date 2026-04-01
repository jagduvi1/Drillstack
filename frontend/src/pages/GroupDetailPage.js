import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGroup, deleteGroup, updateGroup, addMember, updateMemberRole, removeMember, createTeam, getTeams, regenerateInvite, inviteTeam, leaveClub, toggleGroupStar } from "../api/groups";
import { getDrills } from "../api/drills";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupContext";
import { FiTrash2, FiPlus, FiUsers, FiShield, FiUser, FiCopy, FiRefreshCw, FiLink, FiXCircle, FiStar, FiSearch, FiAlertCircle, FiCheck, FiEdit3 } from "react-icons/fi";
import PlayerRoster from "../components/groups/PlayerRoster";
import TrainerRoster from "../components/groups/TrainerRoster";
import { SPORT_GROUPS } from "../components/tactics/sportConfigs";

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshGroups } = useGroups();

  const [group, setGroup] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add member form
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [addError, setAddError] = useState("");

  // Create team form
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");

  // Invite team form
  const [showInviteTeam, setShowInviteTeam] = useState(false);
  const [teamInviteCode, setTeamInviteCode] = useState("");
  const [inviteTeamError, setInviteTeamError] = useState("");

  // Sport editing
  const [editingSport, setEditingSport] = useState(false);
  const [sportValue, setSportValue] = useState("");

  // Drill search for starring
  const [drillSearch, setDrillSearch] = useState("");
  const [drillResults, setDrillResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchGroup = async () => {
    try {
      const res = await getGroup(id);
      setGroup(res.data);
      if (res.data.type === "club") {
        const teamsRes = await getTeams(id);
        setTeams(teamsRes.data);
      }
    } catch {
      setError(t("groups.notFoundOrDenied"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroup(); }, [id]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!group) return null;

  const myRole = group.members.find((m) => (m.user?._id || m.user) === user._id)?.role;
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isTrainer = isAdmin || myRole === "trainer";
  const isClub = group.type === "club";
  const isTeam = group.type === "team";

  const handleDelete = async () => {
    const msg = isClub
      ? t("groups.deleteClub")
      : t("groups.deleteTeam");
    if (!window.confirm(msg)) return;
    await deleteGroup(id);
    refreshGroups();
    navigate("/groups");
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddError("");
    try {
      const res = await addMember(id, { email: newEmail, role: newRole });
      setGroup(res.data);
      setNewEmail("");
      refreshGroups();
    } catch (err) {
      setAddError(err.response?.data?.error || t("groups.failedToAdd"));
    }
  };

  const handleRoleChange = async (userId, role) => {
    const res = await updateMemberRole(id, userId, { role });
    setGroup(res.data);
    refreshGroups();
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm(t("groups.removeMember"))) return;
    const res = await removeMember(id, userId);
    setGroup(res.data);
    refreshGroups();
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    await createTeam(id, { name: teamName.trim(), sport: group.sport });
    setTeamName("");
    setShowTeamForm(false);
    const teamsRes = await getTeams(id);
    setTeams(teamsRes.data);
    refreshGroups();
  };

  const handleInviteTeam = async (e) => {
    e.preventDefault();
    setInviteTeamError("");
    try {
      await inviteTeam(id, teamInviteCode.trim());
      setTeamInviteCode("");
      setShowInviteTeam(false);
      const teamsRes = await getTeams(id);
      setTeams(teamsRes.data);
      refreshGroups();
    } catch (err) {
      setInviteTeamError(err.response?.data?.error || t("groups.failedToInvite"));
    }
  };

  const handleLeaveClub = async () => {
    if (!window.confirm(t("groups.leaveClubConfirm"))) return;
    await leaveClub(id);
    refreshGroups();
    fetchGroup();
  };

  const handleDrillSearch = async (query) => {
    setDrillSearch(query);
    if (!query.trim()) { setDrillResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await getDrills({ search: query, limit: 8 });
      setDrillResults(res.data.drills || []);
    } catch {
      setDrillResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleToggleGroupStar = async (drillId) => {
    try {
      await toggleGroupStar(id, drillId);
      fetchGroup();
    } catch { /* ignore */ }
  };

  const handleEditSport = () => {
    setSportValue(group.sport || "");
    setEditingSport(true);
  };

  const handleSaveSport = async () => {
    await updateGroup(id, { sport: sportValue });
    setGroup({ ...group, sport: sportValue });
    setEditingSport(false);
    refreshGroups();
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(group.inviteCode);
  };

  const handleRegenInvite = async () => {
    const res = await regenerateInvite(id);
    setGroup({ ...group, inviteCode: res.data.inviteCode });
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isClub ? <FiShield /> : <FiUsers />} {group.name}
        </h1>
        <div className="flex gap-sm">
          {isOwner && (
            <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> {t("common.delete")}</button>
          )}
        </div>
      </div>

      {group.description && <p className="text-muted mb-1">{group.description}</p>}

      <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap", alignItems: "center" }}>
        {editingSport ? (
          <div className="flex gap-sm" style={{ alignItems: "center" }}>
            <select className="form-control form-control-sm" value={sportValue} onChange={(e) => setSportValue(e.target.value)} style={{ width: "auto" }}>
              <option value="">{t("drills.sportEg")}</option>
              {SPORT_GROUPS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSport}><FiCheck /></button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingSport(false)}><FiXCircle /></button>
          </div>
        ) : (
          <>
            {group.sport
              ? <span className="tag">{SPORT_GROUPS.find(s => s.key === group.sport)?.label || group.sport}</span>
              : isAdmin && <span className="tag tag-warning">{t("groups.noSport")}</span>
            }
            {isAdmin && !editingSport && (
              <button className="btn btn-secondary btn-sm" onClick={handleEditSport} style={{ padding: "0.15rem 0.5rem" }}><FiEdit3 /></button>
            )}
          </>
        )}
        <span className="tag">{isClub ? t("groups.club") : t("groups.team")}</span>
        {group.parentClub && <span className="tag">{t("groups.club")}: {group.parentClub.name}</span>}
        <span className="tag">{t("groups.yourRole", { role: myRole })}</span>
        {isClub && group.verified === false && (
          <span className="tag tag-warning"><FiAlertCircle /> {t("groups.pendingVerification")}</span>
        )}
        {isClub && group.verified === true && (
          <span className="tag tag-success"><FiCheck /> {t("groups.verified")}</span>
        )}
      </div>

      {/* Leave club (for teams that belong to a club) */}
      {isTeam && group.parentClub && isAdmin && (
        <div className="card mb-1">
          <div className="flex-between">
            <div>
              <strong>{t("groups.partOfClub", { name: group.parentClub.name })}</strong>
              <p className="text-sm text-muted">{t("groups.clubSharingDesc")}</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLeaveClub}>
              <FiXCircle /> {t("groups.leaveClub")}
            </button>
          </div>
        </div>
      )}

      {/* Invite Code */}
      {isAdmin && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: "0.5rem" }}>{t("groups.inviteCode")}</h3>
          <p className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
            {t("groups.inviteCodeDesc", { type: isClub ? t("groups.member").toLowerCase() + "s" : t("groups.trainer").toLowerCase() + "s" })}
          </p>
          <div className="flex gap-sm" style={{ alignItems: "center" }}>
            <code style={{ background: "var(--color-bg)", padding: "0.5rem 1rem", borderRadius: "var(--radius)", fontSize: "1.1rem", letterSpacing: "0.1em", fontWeight: 600 }}>
              {group.inviteCode}
            </code>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyInvite} title="Copy"><FiCopy /></button>
            <button className="btn btn-secondary btn-sm" onClick={handleRegenInvite} title="Generate new code"><FiRefreshCw /></button>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card mb-1">
        <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
          <h3><FiUsers /> {t("groups.members", { count: group.members.length })}</h3>
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          {group.members.map((m) => {
            const mu = m.user;
            const memberId = mu?._id || mu;
            return (
              <div key={memberId} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem",
              }}>
                <div>
                  <strong className="text-sm">{mu?.name || t("common.unknown")}</strong>
                  <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>{mu?.email}</span>
                </div>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  {isAdmin && m.role !== "owner" ? (
                    <select className="form-control form-control-sm" value={m.role}
                      onChange={(e) => handleRoleChange(memberId, e.target.value)}
                      style={{ width: "auto" }}>
                      <option value="admin">{t("groups.admin")}</option>
                      <option value="trainer">{t("groups.trainer")}</option>
                      <option value="viewer">{t("groups.viewer")}</option>
                    </select>
                  ) : (
                    <span className="tag">{t(`groups.${m.role}`) || m.role}</span>
                  )}
                  {isAdmin && memberId !== user._id && m.role !== "owner" && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(memberId)}>
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <form onSubmit={handleAddMember} style={{ marginTop: "0.75rem" }}>
            {addError && <div className="alert alert-danger" style={{ marginBottom: "0.5rem" }}>{addError}</div>}
            <div className="flex gap-sm">
              <input className="form-control" placeholder={t("groups.emailPlaceholder")} value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)} required type="email" style={{ flex: 1 }} />
              <select className="form-control" value={newRole} onChange={(e) => setNewRole(e.target.value)}
                style={{ width: "auto" }}>
                <option value="viewer">{t("groups.viewer")}</option>
                <option value="trainer">{t("groups.trainer")}</option>
                <option value="admin">{t("groups.admin")}</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm"><FiPlus /> {t("common.add")}</button>
            </div>
          </form>
        )}
      </div>

      {/* Trainer Roster */}
      <TrainerRoster groupId={id} canEdit={isAdmin} />

      {/* Player Roster */}
      <PlayerRoster groupId={id} canEdit={isTrainer} sport={group.sport} />

      {/* Starred Drills */}
      {isTrainer && (
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
            <h3><FiStar /> {t("groups.starredDrills", { count: (group.starredDrills || []).filter(Boolean).length })}</h3>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
            {t("groups.starredDrillsDesc")}
          </p>

          {(group.starredDrills || []).filter(Boolean).length > 0 && (
            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {group.starredDrills.filter(Boolean).map((drill) => (
                <div key={drill._id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem",
                }}>
                  <div>
                    <Link to={`/drills/${drill._id}`}><strong className="text-sm">{drill.title}</strong></Link>
                    <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>{drill.sport}</span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleToggleGroupStar(drill._id)}>
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search to add drills */}
          <div style={{ position: "relative" }}>
            <div className="flex gap-sm">
              <FiSearch style={{ position: "absolute", left: "0.75rem", top: "0.6rem", color: "var(--color-muted)" }} />
              <input
                className="form-control"
                placeholder={t("groups.searchDrillsPlaceholder")}
                value={drillSearch}
                onChange={(e) => handleDrillSearch(e.target.value)}
                style={{ paddingLeft: "2rem", flex: 1 }}
              />
            </div>
            {drillResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                background: "var(--color-card)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)", maxHeight: 250, overflowY: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                {drillResults.map((d) => {
                  const alreadyStarred = (group.starredDrills || []).some(
                    (s) => (s?._id || s)?.toString() === d._id
                  );
                  return (
                    <div key={d._id} style={{
                      padding: "0.5rem 0.75rem", display: "flex", justifyContent: "space-between",
                      alignItems: "center", borderBottom: "1px solid var(--color-border)",
                    }}>
                      <div>
                        <strong className="text-sm">{d.title}</strong>
                        {d.sport && <span className="text-sm text-muted" style={{ marginLeft: "0.5rem" }}>{d.sport}</span>}
                      </div>
                      {alreadyStarred ? (
                        <span className="tag tag-success text-sm"><FiCheck /> {t("groups.added")}</span>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => { handleToggleGroupStar(d._id); setDrillSearch(""); setDrillResults([]); }}>
                          <FiPlus /> {t("groups.addDrill")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teams (only for clubs) */}
      {isClub && (
        <div className="card mb-1">
          <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
            <h3>{t("groups.teamsCount", { count: teams.length })}</h3>
            {isAdmin && (
              <div className="flex gap-sm">
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowInviteTeam(!showInviteTeam); setShowTeamForm(false); }}>
                  <FiLink /> {t("groups.inviteExistingTeam")}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowTeamForm(!showTeamForm); setShowInviteTeam(false); }}>
                  <FiPlus /> {t("groups.newTeam")}
                </button>
              </div>
            )}
          </div>

          {/* Invite existing team form */}
          {showInviteTeam && isAdmin && (
            <div style={{ marginBottom: "0.75rem" }}>
              <p className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
                {t("groups.enterTeamCode")}
              </p>
              {inviteTeamError && <div className="alert alert-danger" style={{ marginBottom: "0.5rem" }}>{inviteTeamError}</div>}
              <form onSubmit={handleInviteTeam} className="flex gap-sm">
                <input className="form-control" placeholder={t("groups.teamInviteCodePlaceholder")} value={teamInviteCode}
                  onChange={(e) => setTeamInviteCode(e.target.value)} required style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary btn-sm"><FiLink /> {t("groups.addTeam")}</button>
              </form>
            </div>
          )}

          {/* Create new team form */}
          {showTeamForm && isAdmin && (
            <form onSubmit={handleCreateTeam} className="flex gap-sm" style={{ marginBottom: "0.75rem" }}>
              <input className="form-control" placeholder={t("groups.teamNamePlaceholder")} value={teamName}
                onChange={(e) => setTeamName(e.target.value)} required style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm"><FiPlus /> {t("common.create")}</button>
            </form>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-muted">{t("groups.noTeams")}</p>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {teams.map((team) => (
                <Link key={team._id} to={`/groups/${team._id}`} style={{
                  background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem",
                  textDecoration: "none", color: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiUser /> {team.name}
                  </span>
                  <span className="tag"><FiUsers style={{ fontSize: "0.7rem" }} /> {team.members?.length || 0}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
