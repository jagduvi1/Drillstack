import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPlayerOverview, updatePlayer } from "../api/players";
import { getMetricsForSport } from "../constants/sportMetrics";
import PlayerMetricsEditor from "../components/players/PlayerMetricsEditor";
import PlayerSkillChart from "../components/players/PlayerSkillChart";
import PlayerGoalsList from "../components/players/PlayerGoalsList";
import PlayerNotesFeed from "../components/players/PlayerNotesFeed";
import PlayerAttendanceHistory from "../components/players/PlayerAttendanceHistory";
import { FiArrowLeft, FiUser, FiActivity, FiTarget, FiFileText, FiCalendar, FiEdit3, FiSave } from "react-icons/fi";
import "../styles/playerProfile.css";

const TABS = ["overview", "skills", "goals", "notes", "attendance"];

export default function PlayerProfilePage() {
  const { t } = useTranslation();
  const { groupId, playerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    getPlayerOverview(groupId, playerId)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId, playerId]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!data) return <div className="text-muted">{t("playerProfile.notFound")}</div>;

  const { player, metrics, goals, recentNotes, history, attendance } = data;
  const sport = player.group?.sport || "";
  const metricDefs = getMetricsForSport(sport);
  const metricKeys = metricDefs.filter((d) => d.type === "rating").map((d) => d.key);
  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const handleSaveProfile = async () => {
    try {
      const res = await updatePlayer(groupId, playerId, editForm);
      setData((prev) => ({ ...prev, player: res.data }));
      setEditing(false);
    } catch { /* ignore */ }
  };

  const startEdit = () => {
    setEditForm({
      dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().slice(0, 10) : "",
      height: player.height || "",
      weight: player.weight || "",
      preferredFoot: player.preferredFoot || "",
      preferredHand: player.preferredHand || "",
      position: player.position || "",
      number: player.number || "",
    });
    setEditing(true);
  };

  const TAB_ICONS = {
    overview: <FiUser />, skills: <FiActivity />, goals: <FiTarget />,
    notes: <FiFileText />, attendance: <FiCalendar />,
  };

  return (
    <div className="player-profile" style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "1rem" }}>
        <Link to={`/groups/${groupId}`} className="btn btn-secondary btn-sm">
          <FiArrowLeft /> {t("playerProfile.backToTeam")}
        </Link>
      </div>

      <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="flex-between">
          <div>
            <h1 style={{ margin: 0 }}>
              {player.name}
              {player.number && <span className="text-muted" style={{ fontWeight: 400 }}> #{player.number}</span>}
            </h1>
            <div className="flex gap-sm" style={{ marginTop: "0.35rem", flexWrap: "wrap" }}>
              {player.position && <span className="tag">{player.position}</span>}
              {age !== null && <span className="tag">{t("playerProfile.age", { age })}</span>}
              {player.height && <span className="tag">{player.height} cm</span>}
              {player.weight && <span className="tag">{player.weight} kg</span>}
              {player.preferredFoot && <span className="tag">{t(`playerProfile.foot.${player.preferredFoot}`)}</span>}
              {player.preferredHand && <span className="tag">{t(`playerProfile.hand.${player.preferredHand}`)}</span>}
              {player.skillRating !== null && (
                <span className="tag" style={{ background: "var(--color-primary)", color: "#fff" }}>
                  {player.skillRating}/100
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={editing ? handleSaveProfile : startEdit}>
            {editing ? <><FiSave /> {t("common.save")}</> : <><FiEdit3 /> {t("common.edit")}</>}
          </button>
        </div>

        {editing && (
          <div className="edit-profile-form" style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label className="text-xs">{t("playerProfile.position")}</label>
              <input className="form-control form-control-sm" value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("players.number")}</label>
              <input type="number" className="form-control form-control-sm" value={editForm.number}
                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("playerProfile.dateOfBirth")}</label>
              <input type="date" className="form-control form-control-sm" value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("playerProfile.height")}</label>
              <input type="number" className="form-control form-control-sm" value={editForm.height} placeholder="cm"
                onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("playerProfile.weight")}</label>
              <input type="number" className="form-control form-control-sm" value={editForm.weight} placeholder="kg"
                onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("playerProfile.preferredFoot")}</label>
              <select className="form-control form-control-sm" value={editForm.preferredFoot}
                onChange={(e) => setEditForm({ ...editForm, preferredFoot: e.target.value })}>
                <option value="">—</option>
                <option value="left">{t("playerProfile.foot.left")}</option>
                <option value="right">{t("playerProfile.foot.right")}</option>
                <option value="both">{t("playerProfile.foot.both")}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="player-tabs" style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {TABS.map((t_) => (
          <button key={t_} className={`btn btn-sm ${tab === t_ ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t_)}>
            {TAB_ICONS[t_]} {t(`playerProfile.tabs.${t_}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="player-overview">
          {/* Quick stats */}
          <div className="flex gap-sm" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
            {attendance.rate !== null && (
              <div className="stat-card">
                <span className="stat-value">{attendance.rate}%</span>
                <span className="stat-label">{t("playerProfile.attendanceRate")}</span>
              </div>
            )}
            <div className="stat-card">
              <span className="stat-value">{goals.length}</span>
              <span className="stat-label">{t("playerProfile.activeGoals")}</span>
            </div>
            {player.skillRating !== null && (
              <div className="stat-card">
                <span className="stat-value">{player.skillRating}</span>
                <span className="stat-label">{t("playerProfile.overallRating")}</span>
              </div>
            )}
          </div>

          {/* Metrics summary */}
          {Object.keys(metrics).length > 0 && (
            <div className="card" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: "0 0 0.5rem" }}>{t("playerProfile.tabs.skills")}</h4>
              {/* Certs & levels */}
              {metricDefs.filter((d) => d.type === "cert" || d.type === "level").some((d) => metrics[d.key] !== undefined) && (
                <div className="flex gap-sm" style={{ flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {metricDefs.filter((d) => d.type === "cert" && metrics[d.key]).map((d) => (
                    <span key={d.key} className="tag tag-success" style={{ fontSize: "0.65rem" }}>
                      {t(`metrics.${d.key}`, d.key)}
                    </span>
                  ))}
                  {metricDefs.filter((d) => d.type === "level" && metrics[d.key]).map((d) => (
                    <span key={d.key} className="tag" style={{ fontSize: "0.65rem" }}>
                      {t(`metrics.${d.key}`, d.key)}: {t(`skillLevels.${metrics[d.key]}`, metrics[d.key])}
                    </span>
                  ))}
                </div>
              )}
              {/* Rating bars */}
              <div className="metrics-summary-grid">
                {metricKeys.map((key) => (
                  metrics[key] !== undefined ? (
                    <div key={key} className="metric-summary-item">
                      <span className="text-xs">{t(`metrics.${key}`, key)}</span>
                      <div className="metric-bar">
                        <div className="metric-bar-fill" style={{ width: `${metrics[key]}%` }} />
                      </div>
                      <span className="text-xs" style={{ fontWeight: 600 }}>{metrics[key]}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* Active goals */}
          {goals.length > 0 && (
            <div className="card" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: "0 0 0.5rem" }}>{t("playerProfile.activeGoals")}</h4>
              {goals.slice(0, 3).map((g) => (
                <div key={g._id} className="text-sm" style={{ marginBottom: "0.25rem" }}>
                  <FiTarget style={{ fontSize: "0.7rem", marginRight: "0.25rem" }} />
                  {g.title}
                  {g.metric && <span className="tag" style={{ fontSize: "0.6rem", marginLeft: "0.35rem" }}>{t(`metrics.${g.metric}`, g.metric)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <div className="card" style={{ padding: "0.75rem" }}>
              <h4 style={{ margin: "0 0 0.5rem" }}>{t("playerProfile.recentNotes")}</h4>
              {recentNotes.map((n) => (
                <div key={n._id} className="text-sm" style={{ marginBottom: "0.35rem" }}>
                  <span className={`tag tag-${n.category}`} style={{ fontSize: "0.55rem", marginRight: "0.25rem" }}>
                    {t(`playerProfile.noteCategory.${n.category}`, n.category)}
                  </span>
                  {n.content.slice(0, 100)}{n.content.length > 100 ? "..." : ""}
                  <span className="text-xs text-muted" style={{ marginLeft: "0.35rem" }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="card" style={{ padding: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.75rem" }}>{t("playerProfile.tabs.skills")}</h4>
          <PlayerMetricsEditor
            groupId={groupId}
            playerId={playerId}
            metrics={metrics}
            metricDefs={metricDefs}
            onSaved={(newMetrics) => setData((prev) => ({ ...prev, metrics: newMetrics }))}
          />
          {history.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <PlayerSkillChart history={history} />
              <h4 style={{ margin: "1rem 0 0.5rem" }}>{t("playerProfile.skillHistory")}</h4>
              <div className="skill-history-list">
                {history.slice(0, 20).map((h) => (
                  <div key={h._id} className="text-sm" style={{ marginBottom: "0.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="tag" style={{ fontSize: "0.6rem", minWidth: 60 }}>{t(`metrics.${h.metric}`, h.metric)}</span>
                    <span>{h.oldValue} → {h.newValue}</span>
                    {h.note && <span className="text-muted">({h.note})</span>}
                    <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "goals" && (
        <div className="card" style={{ padding: "0.75rem" }}>
          <PlayerGoalsList groupId={groupId} playerId={playerId} goals={goals} metricKeys={metricKeys} />
        </div>
      )}

      {tab === "notes" && (
        <div className="card" style={{ padding: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>{t("playerProfile.tabs.notes")}</h4>
          <PlayerNotesFeed groupId={groupId} playerId={playerId} notes={recentNotes} />
        </div>
      )}

      {tab === "attendance" && (
        <div className="card" style={{ padding: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>{t("playerProfile.tabs.attendance")}</h4>
          <PlayerAttendanceHistory groupId={groupId} playerId={playerId} attendanceSummary={attendance} />
        </div>
      )}
    </div>
  );
}
