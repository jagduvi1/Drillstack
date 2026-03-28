import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getSession, deleteSession } from "../api/sessions";
import { checkSessionFeasibility, refineSession } from "../api/ai";
import DebugPanel from "../components/common/DebugPanel";
import useDebugPanel from "../hooks/useDebugPanel";
import DrillPreviewModal from "../components/sessions/DrillPreviewModal";
import {
  FiUsers,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiMessageSquare,
  FiSend,
  FiCode,
} from "react-icons/fi";
import { BLOCK_ICONS, BLOCK_COLORS, blockDuration } from "../constants/blockTypes";

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session, loading, refetch } = useFetch(() => getSession(id), [id]);

  // Attendance check state
  const [actualPlayers, setActualPlayers] = useState("");
  const [actualTrainers, setActualTrainers] = useState("");
  const [checking, setChecking] = useState(false);
  const [feasibility, setFeasibility] = useState(null);

  // AI chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  // Debug panel state
  const { debugOpen, debugEntries, toggleDebug, addDebugEntry } = useDebugPanel();

  // Drill preview state
  const [previewDrillId, setPreviewDrillId] = useState(null);

  // Sync chat history from session on load
  useEffect(() => {
    if (session?.aiConversation?.length > 0) {
      setChatHistory(session.aiConversation);
    }
  }, [session]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;
  if (!session) return <div className="alert alert-danger">{t("sessions.notFound")}</div>;

  const handleDelete = async () => {
    if (!window.confirm(t("sessions.deleteSession"))) return;
    await deleteSession(id);
    navigate("/sessions");
  };

  const handleCheckFeasibility = async () => {
    const players = parseInt(actualPlayers, 10);
    const trainers = parseInt(actualTrainers, 10);
    if (isNaN(players) || isNaN(trainers)) return;
    setChecking(true);
    setFeasibility(null);
    try {
      const res = await checkSessionFeasibility(id, players, trainers);
      setFeasibility(res.data);
      if (res.data.debug) {
        addDebugEntry("Feasibility Check", res.data.debug);
      }
      refetch();
    } catch {
      setFeasibility({
        feasible: true,
        summary: t("sessions.couldNotCheck"),
        issues: [],
        adaptedBlocks: [],
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const msg = chatMsg.trim();
    setChatMsg("");
    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await refineSession(id, msg);
      const data = res.data;
      if (data.debug) {
        addDebugEntry(`Chat: "${msg.slice(0, 40)}${msg.length > 40 ? "..." : ""}"`, data.debug);
      }
      // The backend returns the full updated session
      if (data.session) {
        setChatHistory(data.session.aiConversation || []);
        refetch();
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: t("sessions.chatFailed") },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const hasExpected = session.expectedPlayers > 0 || session.expectedTrainers > 0;

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{session.title}</h1>
        <div className="flex gap-sm">
          <button
            className={`btn ${chatOpen ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <FiMessageSquare /> {t("sessions.aiChat")}
          </button>
          <button
            className={`btn ${debugOpen ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleDebug}
          >
            <FiCode /> {t("common.debug")}
          </button>
          <Link to={`/sessions/${id}/edit`} className="btn btn-secondary">
            {t("common.edit")}
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t("common.delete")}
          </button>
        </div>
      </div>

      <div className="card mb-1">
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          {session.sport && <span className="tag">{session.sport}</span>}
          <span className="tag">{t("sessions.minTotal", { count: session.totalDuration })}</span>
          {session.date && (
            <span className="tag">
              {new Date(session.date).toLocaleDateString()}
            </span>
          )}
          <span className="tag">
            {t("common.block", { count: session.blocks?.length || 0 })}
          </span>
          {session.expectedPlayers > 0 && (
            <span className="tag">
              <FiUsers style={{ fontSize: "0.7rem" }} /> {t("sessions.players", { count: session.expectedPlayers })}
            </span>
          )}
          {session.expectedTrainers > 0 && (
            <span className="tag">{t("sessions.trainers", { count: session.expectedTrainers })}</span>
          )}
        </div>
        {session.description && (
          <p className="text-muted" style={{ marginTop: "0.75rem" }}>
            {session.description}
          </p>
        )}
      </div>

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className="card mb-1 ai-chat-panel">
          <h3 className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.75rem" }}>
            <FiMessageSquare /> {t("sessions.refineSessionWithAi")}
          </h3>
          <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
            {t("sessions.refineSessionHint")}
          </p>
          <div className="ai-chat-messages">
            {chatHistory.length === 0 && (
              <p className="text-sm text-muted" style={{ textAlign: "center", padding: "1rem" }}>
                {t("sessions.noMessages")}
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`ai-chat-msg ${msg.role === "user" ? "ai-chat-msg-user" : "ai-chat-msg-assistant"}`}
              >
                <div className="ai-chat-msg-role">
                  {msg.role === "user" ? t("common.you") : t("common.ai")}
                </div>
                <div className="ai-chat-msg-content">{msg.content}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="ai-chat-msg ai-chat-msg-assistant">
                <div className="ai-chat-msg-role">{t("common.ai")}</div>
                <div className="ai-chat-msg-content">
                  <FiLoader className="spin" /> {t("sessions.thinking")}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="ai-chat-input">
            <textarea
              className="form-control"
              placeholder={t("sessions.chatPlaceholder")}
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={handleChatKeyDown}
              rows={2}
            />
            <button
              className="btn btn-primary"
              onClick={handleSendChat}
              disabled={chatLoading || !chatMsg.trim()}
            >
              <FiSend />
            </button>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {debugOpen && (
        <DebugPanel entries={debugEntries} />
      )}

      {/* Day-of attendance check */}
      {hasExpected && (
        <div className="card mb-1 attendance-check-card">
          <h3 className="flex gap-sm" style={{ alignItems: "center", marginBottom: "0.75rem" }}>
            <FiUsers /> {t("sessions.dayOfAttendance")}
          </h3>
          <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
            {t("sessions.plannedFor", { players: session.expectedPlayers, trainers: session.expectedTrainers })}
          </p>
          <div className="flex gap-sm" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-sm">{t("sessions.actualPlayers")}</label>
              <input
                className="form-control"
                type="number"
                min={0}
                value={actualPlayers}
                onChange={(e) => setActualPlayers(e.target.value)}
                placeholder={String(session.expectedPlayers)}
                style={{ width: 100 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-sm">{t("sessions.actualTrainers")}</label>
              <input
                className="form-control"
                type="number"
                min={0}
                value={actualTrainers}
                onChange={(e) => setActualTrainers(e.target.value)}
                placeholder={String(session.expectedTrainers)}
                style={{ width: 100 }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCheckFeasibility}
              disabled={checking || !actualPlayers || !actualTrainers}
            >
              {checking ? (
                <><FiLoader className="spin" /> {t("common.checking")}</>
              ) : (
                t("sessions.checkFeasibility")
              )}
            </button>
          </div>

          {/* Feasibility result */}
          {feasibility && (
            <div
              className={`feasibility-result mt-1 ${feasibility.feasible ? "feasibility-ok" : "feasibility-warning"}`}
            >
              <div className="flex gap-sm" style={{ alignItems: "flex-start" }}>
                {feasibility.feasible ? (
                  <FiCheckCircle style={{ color: "var(--color-success)", marginTop: "0.15rem", flexShrink: 0 }} />
                ) : (
                  <FiAlertCircle style={{ color: "var(--color-warning)", marginTop: "0.15rem", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <strong>{feasibility.summary}</strong>

                  {feasibility.issues?.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      {feasibility.issues.map((issue, i) => (
                        <div key={i} className="feasibility-issue">
                          <div className="text-sm">
                            <strong>{issue.blockLabel}:</strong> {issue.problem}
                          </div>
                          <div className="text-sm" style={{ color: "var(--color-primary)", marginTop: "0.15rem" }}>
                            {t("sessions.suggestion", { text: issue.suggestion })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {feasibility.adaptedBlocks?.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <strong className="text-sm">{t("sessions.suggestedChanges")}</strong>
                      {feasibility.adaptedBlocks.map((ab, i) => (
                        <div key={i} className="feasibility-adaptation">
                          <span className="text-sm">{ab.changes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {session.equipmentSummary?.length > 0 && (
        <div className="card mb-1">
          <h3>{t("sessions.equipmentNeeded")}</h3>
          <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
            {session.equipmentSummary.map((eq, i) => (
              <span key={i} className="tag">
                {eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {(session.blocks || []).map((block, i) => (
        <div
          key={i}
          className="card mb-1"
          style={{ borderLeft: `3px solid ${BLOCK_COLORS[block.type] || "var(--color-border)"}` }}
        >
          <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
            <h3 className="flex gap-sm" style={{ alignItems: "center" }}>
              <span style={{ color: BLOCK_COLORS[block.type] }}>
                {BLOCK_ICONS[block.type]}
              </span>
              {block.label || block.type}
            </h3>
            <span className="tag">{blockDuration(block)} min</span>
          </div>

          {/* Drills block */}
          {block.type === "drills" && (
            <>
              {block.drills?.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("blocks.drill")}</th>
                        <th>{t("sessions.tableDuration")}</th>
                        <th>{t("blocks.notes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.drills.map((d, j) => (
                        <tr key={j}>
                          <td>
                            {d.drill?._id ? (
                              <button
                                type="button"
                                className="drill-name-link"
                                onClick={() => setPreviewDrillId(d.drill._id)}
                              >
                                {d.drill.title}
                              </button>
                            ) : (
                              d.drill?.title || t("common.unknown")
                            )}
                          </td>
                          <td>{d.duration} min</td>
                          <td className="text-sm text-muted">{d.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-sm">{t("sessions.noDrills")}</p>
              )}
            </>
          )}

          {/* Stations block */}
          {block.type === "stations" && (
            <>
              <div className="flex gap-sm mb-1 text-sm">
                <span>
                  {t("sessions.stations", { count: block.stationCount })}
                </span>
                <span>
                  {t("sessions.minPerRotation", { count: block.rotationMinutes })}
                </span>
              </div>
              {block.stations?.length > 0 && (
                <div className="station-grid">
                  {block.stations.map((s, j) => (
                    <div key={j} className="station-card">
                      <div className="station-number">
                        {t("sessions.station", { number: s.stationNumber })}
                      </div>
                      {s.drill ? (
                        <button
                          type="button"
                          className="drill-name-link"
                          onClick={() => setPreviewDrillId(s.drill._id || s.drill)}
                        >
                          {s.drill.title || "Drill"}
                        </button>
                      ) : (
                        <span className="text-sm text-muted">No drill</span>
                      )}
                      {s.notes && (
                        <p
                          className="text-sm text-muted"
                          style={{ marginTop: "0.25rem" }}
                        >
                          {s.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Matchplay block */}
          {block.type === "matchplay" && (
            <div>
              {block.matchDescription && (
                <p style={{ marginBottom: "0.25rem" }}>
                  {block.matchDescription}
                </p>
              )}
              {block.rules && (
                <p className="text-sm text-muted">
                  <strong>{t("sessions.rules")}</strong> {block.rules}
                </p>
              )}
            </div>
          )}

          {/* Break block */}
          {block.type === "break" && (
            <p className="text-sm text-muted">
              {t("sessions.minuteBreak", { count: block.duration })}
            </p>
          )}

          {/* Custom block */}
          {block.type === "custom" && block.customContent && (
            <p style={{ whiteSpace: "pre-wrap" }}>{block.customContent}</p>
          )}

          {/* Block notes */}
          {block.notes && (
            <p
              className="text-sm"
              style={{ marginTop: "0.5rem", fontStyle: "italic" }}
            >
              {block.notes}
            </p>
          )}
        </div>
      ))}

      {/* Drill preview modal */}
      {previewDrillId && (
        <DrillPreviewModal
          drillId={previewDrillId}
          onClose={() => setPreviewDrillId(null)}
        />
      )}
    </div>
  );
}
