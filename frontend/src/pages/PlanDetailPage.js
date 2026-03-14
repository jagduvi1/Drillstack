import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getPlan, deletePlan } from "../api/plans";
import { refineProgram, adaptSession } from "../api/ai";
import { FiEdit, FiTrash2, FiSend, FiMessageCircle, FiRefreshCw, FiX, FiZap } from "react-icons/fi";

const INTENSITY_COLORS = { high: "tag-danger", medium: "tag-warning", low: "" };

export default function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: plan, loading, refetch } = useFetch(() => getPlan(id), [id]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);

  // Adapt session state
  const [adaptingKey, setAdaptingKey] = useState(null); // "wi-si"
  const [adaptConstraints, setAdaptConstraints] = useState("");
  const [adaptLoading, setAdaptLoading] = useState(false);
  const [adaptResult, setAdaptResult] = useState(null); // { key, data }

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [plan?.aiConversation]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!plan) return <div className="alert alert-danger">Plan not found</div>;

  const handleDelete = async () => {
    if (!window.confirm("Delete this plan?")) return;
    await deletePlan(id);
    navigate("/plans");
  };

  const handleChatSend = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    setChatLoading(true);
    try {
      await refineProgram(id, chatMessage.trim());
      setChatMessage("");
      refetch();
    } catch {
      alert("AI refinement failed. Check your AI provider config.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const handleAdaptOpen = (wi, si) => {
    const key = `${wi}-${si}`;
    if (adaptingKey === key) {
      // Toggle off
      setAdaptingKey(null);
      setAdaptConstraints("");
      return;
    }
    setAdaptingKey(key);
    setAdaptConstraints("");
    setAdaptResult(null);
  };

  const handleAdaptSubmit = async (sess) => {
    if (!adaptConstraints.trim() || adaptLoading) return;
    setAdaptLoading(true);
    try {
      const res = await adaptSession(
        {
          title: sess.title,
          focus: sess.focus,
          intensity: sess.intensity,
          durationMinutes: sess.durationMinutes,
          notes: sess.notes,
          dayOfWeek: sess.dayOfWeek,
          sport: plan.sport,
        },
        adaptConstraints.trim()
      );
      setAdaptResult({ key: adaptingKey, data: res.data.adapted });
    } catch {
      alert("Adaptation failed. Check your AI provider config.");
    } finally {
      setAdaptLoading(false);
    }
  };

  const totalSessions = plan.weeklyPlans?.reduce(
    (sum, w) => sum + (w.sessions?.length || 0),
    0
  ) || 0;

  return (
    <div className="drill-detail-layout">
      <div className="drill-detail-main">
        <div className="flex-between mb-1">
          <h1>{plan.title}</h1>
          <div className="flex gap-sm">
            <button className="btn btn-secondary" onClick={() => setShowChat(!showChat)}>
              <FiMessageCircle /> {showChat ? "Hide Chat" : "Refine with AI"}
            </button>
            <Link to={`/plans/${id}/edit`} className="btn btn-secondary"><FiEdit /> Edit</Link>
            <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 /> Delete</button>
          </div>
        </div>

        {/* Overview */}
        <div className="card mb-1">
          <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
            {plan.sport && <span className="tag">{plan.sport}</span>}
            <span className="tag">
              {new Date(plan.startDate).toLocaleDateString()} — {new Date(plan.endDate).toLocaleDateString()}
            </span>
            <span className="tag">{plan.weeklyPlans?.length || 0} weeks</span>
            <span className="tag">{totalSessions} sessions</span>
            {plan.sessionsPerWeek && <span className="tag">{plan.sessionsPerWeek}x / week</span>}
          </div>
          {plan.description && (
            <p style={{ marginTop: "0.75rem" }}>{plan.description}</p>
          )}
        </div>

        {/* Goals */}
        {plan.goals?.length > 0 && (
          <div className="card mb-1">
            <h3>Goals</h3>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
              {plan.goals.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}

        {/* Focus Areas */}
        {plan.focusAreas?.length > 0 && (
          <div className="card mb-1">
            <h3>Focus Areas</h3>
            <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
              {plan.focusAreas.map((area, i) => (
                <span key={i} className="tag">{area}</span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Plans */}
        {plan.weeklyPlans?.length > 0 && plan.weeklyPlans.map((w, wi) => (
          <div key={wi} className="card mb-1">
            <div className="flex-between">
              <h3>Week {w.week}{w.theme ? ` — ${w.theme}` : ""}</h3>
              <span className="text-sm text-muted">{w.sessions?.length || 0} sessions</span>
            </div>
            {w.notes && <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{w.notes}</p>}

            {w.sessions?.length > 0 && (
              <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                {w.sessions.map((sess, si) => {
                  const sessionKey = `${wi}-${si}`;
                  const isAdapting = adaptingKey === sessionKey;
                  const hasResult = adaptResult?.key === sessionKey;

                  return (
                    <div key={si}>
                      <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                        <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
                          <strong className="text-sm">
                            {sess.dayOfWeek ? `${sess.dayOfWeek}: ` : ""}{sess.title || `Session ${si + 1}`}
                          </strong>
                          <div className="flex gap-sm">
                            <span className={`tag ${INTENSITY_COLORS[sess.intensity] || ""}`}>{sess.intensity}</span>
                            <span className="tag">{sess.durationMinutes || 60} min</span>
                            <button
                              className={`btn ${isAdapting ? "btn-primary" : "btn-secondary"} btn-sm`}
                              onClick={() => handleAdaptOpen(wi, si)}
                              title="Adapt for today's conditions"
                            >
                              <FiRefreshCw /> Adapt
                            </button>
                          </div>
                        </div>
                        {sess.focus && <p className="text-sm" style={{ color: "var(--color-primary)" }}>{sess.focus}</p>}
                        {sess.notes && <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{sess.notes}</p>}
                        {sess.linkedSession && (
                          <Link to={`/sessions/${sess.linkedSession._id || sess.linkedSession}`} className="text-sm" style={{ marginTop: "0.25rem", display: "inline-block" }}>
                            View linked session
                          </Link>
                        )}
                      </div>

                      {/* Adapt input panel */}
                      {isAdapting && !hasResult && (
                        <div className="adapt-panel">
                          <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                            <strong className="text-sm">Adapt for today</strong>
                            <button className="btn btn-secondary btn-sm" onClick={() => setAdaptingKey(null)}><FiX /></button>
                          </div>
                          <p className="text-sm text-muted" style={{ marginBottom: "0.5rem" }}>
                            Describe what's different today — players, coaches, space, equipment, time, etc.
                          </p>
                          <textarea
                            className="form-control"
                            placeholder="e.g. 'Only 20 kids showed up instead of 34, and we have 2 coaches instead of 4. One goal is broken so we only have 1 full-size goal.'"
                            value={adaptConstraints}
                            onChange={(e) => setAdaptConstraints(e.target.value)}
                            style={{ minHeight: 70 }}
                          />
                          <div className="flex gap-sm mt-1">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAdaptSubmit(sess)}
                              disabled={adaptLoading || !adaptConstraints.trim()}
                            >
                              <FiZap /> {adaptLoading ? "Adapting..." : "Adapt Session"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Adapted result */}
                      {hasResult && (
                        <div className="adapt-result">
                          <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                            <strong><FiZap /> {adaptResult.data.title || "Adapted Session"}</strong>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setAdaptResult(null); setAdaptingKey(null); }}><FiX /> Close</button>
                          </div>
                          {adaptResult.data.changes && (
                            <p className="text-sm" style={{ color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                              {adaptResult.data.changes}
                            </p>
                          )}
                          {adaptResult.data.warmup && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong className="text-sm">Warmup</strong>
                              <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{adaptResult.data.warmup}</p>
                            </div>
                          )}
                          {adaptResult.data.main && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong className="text-sm">Main</strong>
                              <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{adaptResult.data.main}</p>
                            </div>
                          )}
                          {adaptResult.data.cooldown && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong className="text-sm">Cooldown</strong>
                              <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{adaptResult.data.cooldown}</p>
                            </div>
                          )}
                          {adaptResult.data.coachingNotes && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong className="text-sm">Coaching Notes</strong>
                              <p className="text-sm text-muted" style={{ whiteSpace: "pre-wrap" }}>{adaptResult.data.coachingNotes}</p>
                            </div>
                          )}
                          <div className="flex gap-sm">
                            <span className="tag">{adaptResult.data.durationMinutes || sess.durationMinutes || 60} min</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setAdaptResult(null); setAdaptConstraints(""); }}>
                              <FiRefreshCw /> Adapt again
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>Refine Program with AI</h3>
            <p className="text-sm text-muted">Tell the AI how you want to change this program</p>
          </div>
          <div className="chat-messages">
            {plan.aiConversation?.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                <div className="chat-msg-label">{msg.role === "user" ? "You" : "AI"}</div>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <textarea
              className="form-control"
              placeholder="e.g. 'Add a recovery session on Wednesdays' or 'Make week 3 more intense'"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={handleChatKeyDown}
              rows={2}
            />
            <button
              className="btn btn-primary"
              onClick={handleChatSend}
              disabled={chatLoading || !chatMessage.trim()}
            >
              <FiSend /> {chatLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
