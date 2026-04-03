import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPlayerOverview, updatePlayer, updatePlayerMetrics } from "../api/players";
import { getGroup } from "../api/groups";
import { getMetricsForSport, getEffectiveMetrics, computeWeightedAvg, getPositionsForSport, getDualPositions, hasDualPositions, SPORTS_WITH_NUMBERS, SPORTS_WITH_FOOT, SPORTS_WITH_HAND } from "../constants/sportMetrics";
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
  const [autoSkills, setAutoSkills] = useState(true);
  const [members, setMembers] = useState([]);
  const [groupData, setGroupData] = useState(null);

  useEffect(() => {
    getPlayerOverview(groupId, playerId)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    getGroup(groupId)
      .then((res) => { setMembers(res.data?.members || []); setGroupData(res.data); })
      .catch(() => {});
  }, [groupId, playerId]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!data) return <div className="text-muted">{t("playerProfile.notFound")}</div>;

  const { player, metrics, goals, recentNotes, history, attendance } = data;
  const sport = player.group?.sport || "";
  const metricDefs = groupData ? getEffectiveMetrics(groupData) : getMetricsForSport(sport);
  const metricKeys = metricDefs.filter((d) => d.type === "rating").map((d) => d.key);

  const positions = getPositionsForSport(sport);
  const dual = getDualPositions(sport);
  const isDual = hasDualPositions(sport);
  const hasNumbers = SPORTS_WITH_NUMBERS.includes(sport?.split("-")[0]);
  const sportBase = sport?.split("-")[0] || "";
  const showFoot = SPORTS_WITH_FOOT.includes(sportBase);
  const showHand = SPORTS_WITH_HAND.includes(sportBase);

  // Compute average skill — simple (unweighted) and weighted
  const avgSkill = computeWeightedAvg(metricDefs, metrics, false);
  const weightedAvg = groupData?.skillWeightsEnabled ? computeWeightedAvg(metricDefs, metrics, true) : null;

  // Helper: get display name for a metric key (prefer custom name, fallback to i18n)
  const metricLabel = (key) => {
    const def = metricDefs.find((d) => d.key === key);
    return def?.name || t(`metrics.${key}`, key);
  };

  // Auto-generate strengths/weaknesses from top/bottom 3 rated metrics
  const ratedMetrics = metricKeys
    .filter((k) => typeof metrics[k] === "number")
    .map((k) => ({ key: k, value: metrics[k] }))
    .sort((a, b) => b.value - a.value);
  const autoStrengths = ratedMetrics.slice(0, 3).map((m) => metricLabel(m.key));
  const autoWeaknesses = ratedMetrics.length > 3
    ? ratedMetrics.slice(-3).reverse().map((m) => metricLabel(m.key))
    : [];

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const handleSaveProfile = async () => {
    try {
      const saveData = autoSkills
        ? { ...editForm, strengths: autoStrengths, weaknesses: autoWeaknesses }
        : editForm;
      const res = await updatePlayer(groupId, playerId, saveData);
      setData((prev) => ({ ...prev, player: res.data }));
      setEditing(false);
    } catch { /* ignore */ }
  };

  const startEdit = () => {
    setEditForm({
      name: player.name || "",
      dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().slice(0, 10) : "",
      height: player.height || "",
      weight: player.weight || "",
      preferredFoot: player.preferredFoot || "",
      preferredHand: player.preferredHand || "",
      position: player.position || "",
      defencePosition: player.defencePosition || "",
      number: player.number || "",
      strengths: player.strengths || [],
      weaknesses: player.weaknesses || [],
      notes: player.notes || "",
      linkedUser: player.linkedUser || "",
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
              {player.defencePosition && <span className="tag">{player.defencePosition}</span>}
              {age !== null && <span className="tag">{t("playerProfile.age", { age })}</span>}
              {player.height > 0 && <span className="tag">{player.height} cm</span>}
              {player.weight > 0 && <span className="tag">{player.weight} kg</span>}
              {showFoot && player.preferredFoot && <span className="tag">{t(`playerProfile.foot.${player.preferredFoot}`)}</span>}
              {showHand && player.preferredHand && <span className="tag">{t(`playerProfile.hand.${player.preferredHand}`)}</span>}
              {avgSkill !== null && (
                <span className="tag" style={{ background: "var(--color-primary)", color: "#fff", fontSize: "0.7rem" }}>
                  {avgSkill}
                </span>
              )}
              {weightedAvg !== null && (
                <span className="tag" style={{ background: "#f59e0b", color: "#fff", fontSize: "0.7rem" }}>
                  {weightedAvg}
                </span>
              )}
              {autoStrengths[0] && <span className="tag tag-success" style={{ fontSize: "0.7rem" }}>{autoStrengths[0]}</span>}
              {autoWeaknesses[0] && <span className="tag" style={{ fontSize: "0.7rem", background: "#fee2e2", color: "#991b1b" }}>{autoWeaknesses[0]}</span>}
              {player.linkedUser && <span className="tag" style={{ fontSize: "0.7rem", background: "#dbeafe", color: "#1e40af" }}><FiUser style={{ fontSize: "0.6rem" }} /> {t("players.linked")}</span>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={editing ? handleSaveProfile : startEdit}>
            {editing ? <><FiSave /> {t("common.save")}</> : <><FiEdit3 /> {t("common.edit")}</>}
          </button>
        </div>

        {editing && (
          <div className="edit-profile-form" style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label className="text-xs">{t("players.name")}</label>
              <input className="form-control form-control-sm" value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">{t("players.linkMember")}</label>
              <select className="form-control form-control-sm" value={editForm.linkedUser || ""}
                onChange={(e) => setEditForm({ ...editForm, linkedUser: e.target.value || null })}>
                <option value="">{t("players.linkMember")}</option>
                {members.map((m) => {
                  const uid = m.user?._id || m.user;
                  const name = m.user?.name || uid;
                  return <option key={uid} value={uid}>{name}</option>;
                })}
              </select>
            </div>
            {isDual ? (
              <>
                <div>
                  <label className="text-xs">{t("players.offencePosition", "Offence position")}</label>
                  <select className="form-control form-control-sm" value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}>
                    <option value="">--</option>
                    {dual.offence.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs">{t("players.defencePosition", "Defence position")}</label>
                  <select className="form-control form-control-sm" value={editForm.defencePosition}
                    onChange={(e) => setEditForm({ ...editForm, defencePosition: e.target.value })}>
                    <option value="">--</option>
                    {dual.defence.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>
              </>
            ) : positions.length > 0 ? (
              <div>
                <label className="text-xs">{t("playerProfile.position")}</label>
                <select className="form-control form-control-sm" value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}>
                  <option value="">--</option>
                  {positions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs">{t("playerProfile.position")}</label>
                <input className="form-control form-control-sm" value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
              </div>
            )}
            {hasNumbers && (
              <div>
                <label className="text-xs">{t("players.number")}</label>
                <input type="number" className="form-control form-control-sm" value={editForm.number}
                  onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} />
              </div>
            )}
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
            {showFoot && (
              <div>
                <label className="text-xs">{t("playerProfile.preferredFoot")}</label>
                <select className="form-control form-control-sm" value={editForm.preferredFoot}
                  onChange={(e) => setEditForm({ ...editForm, preferredFoot: e.target.value })}>
                  <option value="">--</option>
                  <option value="left">{t("playerProfile.foot.left")}</option>
                  <option value="right">{t("playerProfile.foot.right")}</option>
                  <option value="ambidextrous">{t("playerProfile.foot.ambidextrous")}</option>
                </select>
              </div>
            )}
            {showHand && (
              <div>
                <label className="text-xs">{t("playerProfile.preferredHand", "Preferred hand")}</label>
                <select className="form-control form-control-sm" value={editForm.preferredHand}
                  onChange={(e) => setEditForm({ ...editForm, preferredHand: e.target.value })}>
                  <option value="">--</option>
                  <option value="left">{t("playerProfile.hand.left")}</option>
                  <option value="right">{t("playerProfile.hand.right")}</option>
                  <option value="ambidextrous">{t("playerProfile.hand.ambidextrous")}</option>
                </select>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <label className="text-xs" style={{ margin: 0, cursor: "pointer" }} onClick={() => setAutoSkills(!autoSkills)}>
                {t("playerProfile.autoSkills")}
              </label>
              <button type="button" onClick={() => setAutoSkills(!autoSkills)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative",
                  background: autoSkills ? "var(--color-primary)" : "#ccc", transition: "background 0.2s",
                }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
                  left: autoSkills ? 20 : 2, transition: "left 0.2s",
                }} />
              </button>
            </div>
            {autoSkills ? (
              <>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="text-xs">{t("players.strengths")}</label>
                  <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                    {autoStrengths.length > 0
                      ? autoStrengths.map((s) => <span key={s} className="tag tag-success" style={{ fontSize: "0.75rem" }}>{s}</span>)
                      : <span className="text-sm text-muted">{t("playerProfile.noMetricsYet")}</span>}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="text-xs">{t("players.weaknesses")}</label>
                  <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                    {autoWeaknesses.length > 0
                      ? autoWeaknesses.map((s) => <span key={s} className="tag" style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#991b1b" }}>{s}</span>)
                      : <span className="text-sm text-muted">{t("playerProfile.noMetricsYet")}</span>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="text-xs">{t("players.strengths")}</label>
                  <input className="form-control form-control-sm" placeholder={t("players.strengthsPlaceholder")}
                    value={(editForm.strengths || []).join(", ")}
                    onChange={(e) => setEditForm({ ...editForm, strengths: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="text-xs">{t("players.weaknesses")}</label>
                  <input className="form-control form-control-sm" placeholder={t("players.weaknessesPlaceholder")}
                    value={(editForm.weaknesses || []).join(", ")}
                    onChange={(e) => setEditForm({ ...editForm, weaknesses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              </>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="text-xs">{t("players.notes")}</label>
              <textarea className="form-control form-control-sm" value={editForm.notes || ""}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ minHeight: 50 }} />
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
            {avgSkill !== null && (
              <div className="stat-card">
                <span className="stat-value">{avgSkill}</span>
                <span className="stat-label">{t("playerProfile.avgSkill")}</span>
              </div>
            )}
            {weightedAvg !== null && (
              <div className="stat-card">
                <span className="stat-value" style={{ color: "#f59e0b" }}>{weightedAvg}</span>
                <span className="stat-label">{t("playerProfile.weightedAvg")}</span>
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
                      {metricLabel(d.key)}
                    </span>
                  ))}
                  {metricDefs.filter((d) => d.type === "level" && metrics[d.key]).map((d) => (
                    <span key={d.key} className="tag" style={{ fontSize: "0.65rem" }}>
                      {metricLabel(d.key)}: {t(`skillLevels.${metrics[d.key]}`, metrics[d.key])}
                    </span>
                  ))}
                </div>
              )}
              {/* Average skill slider + weighted bar */}
              {avgSkill !== null && (
                <div style={{ marginBottom: "0.75rem", borderBottom: "1px solid var(--color-border, #e5e7eb)", paddingBottom: "0.75rem" }}>
                  <div className="metric-summary-item">
                    <span className="text-xs" style={{ fontWeight: 700 }}>{t("playerProfile.avgSkill")}</span>
                    <input type="range" min={0} max={100} value={avgSkill}
                      style={{ flex: 1 }}
                      onChange={(e) => {
                        const target = Number(e.target.value);
                        const delta = target - avgSkill;
                        const ratedKeys = metricKeys.filter((k) => typeof metrics[k] === "number");
                        if (ratedKeys.length === 0) return;
                        const newMetrics = { ...metrics };
                        for (const k of ratedKeys) {
                          newMetrics[k] = Math.max(0, Math.min(100, Math.round(metrics[k] + delta)));
                        }
                        setData((prev) => ({ ...prev, metrics: newMetrics }));
                      }}
                      onMouseUp={() => {
                        const ratedKeys = metricKeys.filter((k) => typeof metrics[k] === "number");
                        if (ratedKeys.length === 0) return;
                        const ratings = {};
                        for (const k of ratedKeys) ratings[k] = metrics[k];
                        updatePlayerMetrics(groupId, playerId, { ratings }).catch((err) => console.error("Failed to save metrics:", err));
                      }}
                      onTouchEnd={() => {
                        const ratedKeys = metricKeys.filter((k) => typeof metrics[k] === "number");
                        if (ratedKeys.length === 0) return;
                        const ratings = {};
                        for (const k of ratedKeys) ratings[k] = metrics[k];
                        updatePlayerMetrics(groupId, playerId, { ratings }).catch((err) => console.error("Failed to save metrics:", err));
                      }}
                    />
                    <span className="text-xs" style={{ fontWeight: 700, minWidth: 24, textAlign: "right" }}>{avgSkill}</span>
                  </div>
                  {weightedAvg !== null && (
                    <div className="metric-summary-item" style={{ marginTop: "0.3rem" }}>
                      <span className="text-xs" style={{ fontWeight: 700 }}>{t("playerProfile.weightedAvg")}</span>
                      <div className="metric-bar">
                        <div className="metric-bar-fill" style={{ width: `${weightedAvg}%`, background: "#f59e0b" }} />
                      </div>
                      <span className="text-xs" style={{ fontWeight: 700 }}>{weightedAvg}</span>
                    </div>
                  )}
                </div>
              )}
              {/* General metrics — stored on player but not in the sport's default set */}
              {(() => {
                const sportDefaultKeys = new Set(getMetricsForSport(sport).map((d) => d.key));
                const allDefinedKeys = new Set(metricDefs.map((d) => d.key));
                const extra = Object.entries(metrics).filter(([key, val]) => typeof val === "number" && !sportDefaultKeys.has(key) && !allDefinedKeys.has(key));
                return extra.length > 0 ? (
                  <>
                    <div className="metrics-summary-grid">
                      {extra.map(([key, val]) => (
                        <div key={key} className="metric-summary-item">
                          <span className="text-xs">{t(`metrics.${key}`, key)}</span>
                          <div className="metric-bar">
                            <div className="metric-bar-fill" style={{ width: `${val}%`, opacity: 0.6 }} />
                          </div>
                          <span className="text-xs" style={{ fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderBottom: "1px solid var(--color-border, #e5e7eb)", margin: "0.5rem 0" }} />
                  </>
                ) : null;
              })()}
              {/* Sport-specific rating bars */}
              <div className="metrics-summary-grid">
                {metricKeys.map((key) => (
                  metrics[key] !== undefined ? (
                    <div key={key} className="metric-summary-item">
                      <span className="text-xs">{metricLabel(key)}</span>
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
                  {g.metric && <span className="tag" style={{ fontSize: "0.6rem", marginLeft: "0.35rem" }}>{metricLabel(g.metric)}</span>}
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
              <PlayerSkillChart history={history} metricDefs={metricDefs} />
              <h4 style={{ margin: "1rem 0 0.5rem" }}>{t("playerProfile.skillHistory")}</h4>
              <div className="skill-history-list">
                {history.slice(0, 20).map((h) => (
                  <div key={h._id} className="text-sm" style={{ marginBottom: "0.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="tag" style={{ fontSize: "0.6rem", minWidth: 60 }}>{metricLabel(h.metric)}</span>
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
