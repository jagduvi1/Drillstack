import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPlayers } from "../../api/players";
import { splitSimple, splitSmart } from "../../api/splits";
import { FiUsers, FiShuffle, FiCpu, FiLoader } from "react-icons/fi";

export default function TeamSplitter({ groupId, attendees }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [groupCount, setGroupCount] = useState(2);
  const [criteria, setCriteria] = useState("");
  const [groups, setGroups] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null); // null | "simple" | "smart"

  useEffect(() => {
    if (!groupId) return;
    getPlayers(groupId).then((res) => {
      // If we have attendees, only use those; otherwise use all active players
      const all = res.data || [];
      if (attendees?.length > 0) {
        const attendeeSet = new Set(attendees.map((a) => a?._id || a));
        setPlayers(all.filter((p) => attendeeSet.has(p._id)));
      } else {
        setPlayers(all);
      }
    }).catch(() => {});
  }, [groupId, attendees]);

  const handleSimpleSplit = async () => {
    setLoading(true);
    try {
      const res = await splitSimple(players.map((p) => p._id), groupCount);
      setGroups(res.data.groups);
      setSummary("");
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSmartSplit = async () => {
    setLoading(true);
    try {
      const res = await splitSmart(players.map((p) => p._id), groupCount, criteria);
      setGroups(res.data.groups);
      setSummary(res.data.summary || "");
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleReshuffle = () => {
    if (mode === "smart") handleSmartSplit();
    else handleSimpleSplit();
  };

  if (!groupId || players.length < 2) return null;

  return (
    <div className="team-splitter">
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0 }}>
          <FiUsers style={{ marginRight: "0.3rem" }} />
          {t("splits.title")} ({players.length} {t("splits.players")})
        </h4>
      </div>

      {!groups ? (
        <div>
          <div className="flex gap-sm mb-1" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <label className="text-sm" style={{ fontWeight: 600 }}>{t("splits.numberOfGroups")}:</label>
            <div className="flex gap-sm" style={{ alignItems: "center" }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button key={n}
                  className={`btn btn-sm ${groupCount === n ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setGroupCount(n)}
                  disabled={n > players.length}
                >{n}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => { setMode("simple"); handleSimpleSplit(); }} disabled={loading}>
              <FiShuffle /> {t("splits.randomSplit")}
            </button>
            <button className="btn btn-primary" onClick={() => setMode("smart")} disabled={loading}>
              <FiCpu /> {t("splits.smartSplit")}
            </button>
          </div>

          {mode === "smart" && (
            <div style={{ marginTop: "0.75rem" }}>
              <input className="form-control" placeholder={t("splits.criteriaPlaceholder")}
                value={criteria} onChange={(e) => setCriteria(e.target.value)}
                style={{ marginBottom: "0.5rem" }} />
              <button className="btn btn-primary btn-sm" onClick={handleSmartSplit} disabled={loading}>
                {loading ? <><FiLoader className="spin" /> {t("splits.splitting")}</> : <><FiCpu /> {t("splits.splitWithAi")}</>}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {summary && <p className="text-sm text-muted mb-1">{summary}</p>}

          <div className="split-groups-grid">
            {groups.map((g, i) => (
              <div key={i} className="split-group-card">
                <div className="split-group-header">
                  <strong>{g.name}</strong>
                  <span className="text-sm text-muted">{g.players.length} {t("splits.players")}</span>
                </div>
                {g.reasoning && <p className="text-sm text-muted" style={{ margin: "0.25rem 0" }}>{g.reasoning}</p>}
                <div className="split-group-players">
                  {g.players.map((p) => (
                    <div key={p._id} className="split-player">
                      <span className="split-player-name">{p.name}</span>
                      {p.position && <span className="split-player-pos">{p.position}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-sm mt-1">
            <button className="btn btn-secondary btn-sm" onClick={handleReshuffle} disabled={loading}>
              <FiShuffle /> {loading ? "..." : t("splits.reshuffle")}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setGroups(null); setSummary(""); setMode(null); }}>
              {t("splits.reset")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
