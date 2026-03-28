import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTodaySessions } from "../api/sessions";
import { checkSessionFeasibility } from "../api/ai";
import DrillPreviewModal from "../components/sessions/DrillPreviewModal";
import {
  FiUsers,
  FiLoader,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
} from "react-icons/fi";
import { BLOCK_ICONS, BLOCK_COLORS, blockDuration } from "../constants/blockTypes";

export default function TodayPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewDrillId, setPreviewDrillId] = useState(null);

  // Per-session state keyed by session ID
  const [attendance, setAttendance] = useState({}); // { [id]: { players, trainers } }
  const [expanded, setExpanded] = useState({});     // { [id]: true }
  const [feasibility, setFeasibility] = useState({});// { [id]: { loading, result } }

  useEffect(() => {
    getTodaySessions()
      .then((res) => {
        setEntries(res.data);
        // Auto-expand if only one session
        if (res.data.length === 1) {
          setExpanded({ [res.data[0].session._id]: true });
        }
        // Pre-fill attendance from session expected values
        const att = {};
        for (const e of res.data) {
          att[e.session._id] = {
            players: e.session.expectedPlayers || "",
            trainers: e.session.expectedTrainers || "",
          };
        }
        setAttendance(att);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateAttendance = (id, field, value) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleCheckFeasibility = async (sessionId) => {
    const att = attendance[sessionId];
    if (!att?.players || !att?.trainers) return;
    setFeasibility((prev) => ({ ...prev, [sessionId]: { loading: true, result: null } }));
    try {
      const res = await checkSessionFeasibility(
        sessionId,
        parseInt(att.players, 10),
        parseInt(att.trainers, 10)
      );
      setFeasibility((prev) => ({ ...prev, [sessionId]: { loading: false, result: res.data } }));
    } catch {
      setFeasibility((prev) => ({
        ...prev,
        [sessionId]: { loading: false, result: { feasible: true, summary: "Could not check.", issues: [] } },
      }));
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) return <div className="today-page"><div className="loading"><FiLoader className="spin" /> {t("common.loading")}</div></div>;

  return (
    <div className="today-page">
      <div className="today-header">
        <h1><FiCalendar /> {t("today.title")}</h1>
        <p className="text-muted">{dateStr}</p>
      </div>

      {entries.length === 0 ? (
        <div className="today-empty">
          <FiCalendar style={{ fontSize: "2.5rem", color: "var(--color-muted)" }} />
          <p>{t("today.noSessions")}</p>
          <p className="text-sm text-muted">{t("today.noSessionsHint")}</p>
          <Link to="/sessions" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            {t("today.browseSessions")}
          </Link>
        </div>
      ) : (
        entries.map(({ session: sess, source, plan }) => {
          const id = sess._id;
          const isExpanded = expanded[id];
          const att = attendance[id] || {};
          const players = parseInt(att.players, 10) || 0;
          const trainers = parseInt(att.trainers, 10) || 0;
          const feas = feasibility[id];

          return (
            <div key={id} className="today-session-card">
              {/* Session header — always visible */}
              <button type="button" className="today-session-header" onClick={() => toggleExpand(id)}>
                <div>
                  <h2>{sess.title}</h2>
                  <div className="today-session-meta">
                    {sess.sport && <span className="tag">{sess.sport}</span>}
                    <span className="tag">{sess.totalDuration || 0} min</span>
                    <span className="tag">{t("common.block", { count: (sess.blocks || []).length })}</span>
                  </div>
                  {plan && (
                    <p className="text-sm" style={{ color: "var(--color-primary)", marginTop: "0.25rem" }}>
                      {t("plans.fromPlan", { title: plan.planTitle, week: plan.weekNum })}
                    </p>
                  )}
                </div>
                <span className="today-expand-icon">
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </button>

              {isExpanded && (
                <div className="today-session-body">
                  {/* Attendance inputs */}
                  <div className="today-attendance">
                    <h3><FiUsers /> {t("today.attendance")}</h3>
                    <div className="today-attendance-inputs">
                      <div className="today-att-field">
                        <label>{t("today.players")}</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={att.players || ""}
                          onChange={(e) => updateAttendance(id, "players", e.target.value)}
                          placeholder={String(sess.expectedPlayers || 0)}
                        />
                      </div>
                      <div className="today-att-field">
                        <label>{t("today.trainers")}</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={att.trainers || ""}
                          onChange={(e) => updateAttendance(id, "trainers", e.target.value)}
                          placeholder={String(sess.expectedTrainers || 0)}
                        />
                      </div>
                      <button
                        className="btn btn-primary today-check-btn"
                        onClick={() => handleCheckFeasibility(id)}
                        disabled={feas?.loading || !att.players || !att.trainers}
                      >
                        {feas?.loading ? <FiLoader className="spin" /> : <FiCheckCircle />} {t("today.check")}
                      </button>
                    </div>

                    {/* Feasibility result */}
                    {feas?.result && (
                      <div className={`today-feasibility ${feas.result.feasible ? "today-feas-ok" : "today-feas-warn"}`}>
                        <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
                          {feas.result.feasible
                            ? <FiCheckCircle style={{ color: "var(--color-success)", flexShrink: 0, marginTop: 2 }} />
                            : <FiAlertTriangle style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 2 }} />}
                          <div>
                            <strong className="text-sm">{feas.result.summary}</strong>
                            {feas.result.issues?.map((issue, i) => (
                              <div key={i} className="today-feas-issue">
                                <span className="text-sm"><strong>{issue.blockLabel}:</strong> {issue.problem}</span>
                                <span className="text-sm" style={{ color: "var(--color-primary)" }}>{issue.suggestion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Blocks — the actual training plan */}
                  <div className="today-blocks">
                    {(sess.blocks || []).sort((a, b) => a.order - b.order).map((block, bi) => (
                      <div key={bi} className="today-block" style={{ borderLeftColor: BLOCK_COLORS[block.type] || "#ccc" }}>
                        <div className="today-block-header">
                          <span className="today-block-icon" style={{ color: BLOCK_COLORS[block.type] }}>
                            {BLOCK_ICONS[block.type]}
                          </span>
                          <strong>{block.label || block.type}</strong>
                          <span className="tag">{blockDuration(block)} min</span>
                        </div>

                        {/* Drill block */}
                        {block.type === "drills" && (
                          <div className="today-drill-list">
                            {(block.drills || []).map((d, di) => (
                              <div key={di} className="today-drill-item">
                                <button
                                  type="button"
                                  className="drill-name-link"
                                  onClick={() => setPreviewDrillId(d.drill?._id)}
                                >
                                  {d.drill?.title || "Drill"}
                                </button>
                                <span className="text-sm text-muted">{d.duration} min</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Station block with group calc */}
                        {block.type === "stations" && (
                          <div>
                            <div className="today-station-info">
                              <span>{t("sessions.stations", { count: block.stationCount })}</span>
                              <span>{t("sessions.minPerRotation", { count: block.rotationMinutes })}</span>
                            </div>
                            {players > 0 && (
                              <div className="today-group-calc">
                                <FiUsers style={{ fontSize: "0.85rem" }} />
                                {t("today.perStation", { count: Math.floor(players / block.stationCount) })}
                                {players % block.stationCount !== 0 && (
                                  <span className="text-muted">
                                    {t("today.extra", { count: players % block.stationCount })}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="today-station-grid">
                              {(block.stations || []).map((s, si) => (
                                <div key={si} className="today-station-card">
                                  <span className="today-station-num">St. {s.stationNumber}</span>
                                  {s.drill ? (
                                    <button
                                      type="button"
                                      className="drill-name-link text-sm"
                                      onClick={() => setPreviewDrillId(s.drill._id)}
                                    >
                                      {s.drill.title}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-muted">No drill</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matchplay with team calc */}
                        {block.type === "matchplay" && (
                          <div>
                            {block.matchDescription && <p className="text-sm">{block.matchDescription}</p>}
                            {block.rules && <p className="text-sm text-muted">{t("sessions.rules")} {block.rules}</p>}
                            {players > 0 && (
                              <div className="today-group-calc">
                                <FiUsers style={{ fontSize: "0.85rem" }} />
                                {t("today.teamsOf", { count: Math.floor(players / 2) })}
                                {players % 2 !== 0 && <span className="text-muted">{t("today.oneExtra")}</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Break */}
                        {block.type === "break" && (
                          <p className="text-sm text-muted">{t("today.minBreak", { count: block.duration })}</p>
                        )}

                        {/* Custom */}
                        {block.type === "custom" && block.customContent && (
                          <p className="text-sm">{block.customContent}</p>
                        )}

                        {block.notes && (
                          <p className="text-sm" style={{ marginTop: "0.5rem", fontStyle: "italic" }}>{block.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Equipment */}
                  {sess.equipmentSummary?.length > 0 && (
                    <div className="today-equipment">
                      <h3>{t("today.equipment")}</h3>
                      <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                        {sess.equipmentSummary.map((eq, i) => (
                          <span key={i} className="tag">{eq}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {previewDrillId && (
        <DrillPreviewModal
          drillId={previewDrillId}
          onClose={() => setPreviewDrillId(null)}
        />
      )}
    </div>
  );
}
