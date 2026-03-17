import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGroup, deleteGroup, addMember, updateMemberRole, removeMember, createTeam, getTeams, regenerateInvite, inviteTeam, leaveClub } from "../api/groups";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupContext";
import { FiTrash2, FiPlus, FiUsers, FiShield, FiUser, FiCopy, FiRefreshCw, FiLink, FiXCircle } from "react-icons/fi";

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
  const [newRole, setNewRole] = useState("member");
  const [addError, setAddError] = useState("");

  // Create team form
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");

  // Invite team form
  const [showInviteTeam, setShowInviteTeam] = useState(false);
  const [teamInviteCode, setTeamInviteCode] = useState("");
  const [inviteTeamError, setInviteTeamError] = useState("");

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
  const isAdmin = myRole === "admin";
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
          {isAdmin && (
            <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> {t("common.delete")}</button>
          )}
        </div>
      </div>

      {group.description && <p className="text-muted mb-1">{group.description}</p>}

      <div className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
        {group.sport && <span className="tag">{group.sport}</span>}
        <span className="tag">{isClub ? t("groups.club") : t("groups.team")}</span>
        {group.parentClub && <span className="tag">{t("groups.club")}: {group.parentClub.name}</span>}
        <span className="tag">{t("groups.yourRole", { role: myRole })}</span>
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
                  {isAdmin ? (
                    <select className="form-control form-control-sm" value={m.role}
                      onChange={(e) => handleRoleChange(memberId, e.target.value)}
                      style={{ width: "auto" }}>
                      <option value="admin">{t("groups.admin")}</option>
                      <option value="trainer">{t("groups.trainer")}</option>
                      <option value="member">{t("groups.member")}</option>
                    </select>
                  ) : (
                    <span className="tag">{m.role}</span>
                  )}
                  {isAdmin && memberId !== user._id && (
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
                <option value="member">{t("groups.member")}</option>
                <option value="trainer">{t("groups.trainer")}</option>
                <option value="admin">{t("groups.admin")}</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm"><FiPlus /> {t("common.add")}</button>
            </div>
          </form>
        )}
      </div>

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
