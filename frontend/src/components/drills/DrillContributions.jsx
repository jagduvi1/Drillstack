import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTactics } from "../../api/tactics";
import { FiVideo, FiImage, FiFlag, FiPlus, FiTrash2, FiTarget } from "react-icons/fi";

export default function DrillContributions({
  drillId, drillTitle, drillDescription, contributions, groups, userId,
  onAddVideo, onAddDrawing, onAddTactic, onDeleteContribution, onReport,
}) {
  const { t } = useTranslation();
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showLinkTactic, setShowLinkTactic] = useState(false);
  const [userTactics, setUserTactics] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoVisibility, setVideoVisibility] = useState("public");
  const [videoGroup, setVideoGroup] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    await onAddVideo({
      url: videoUrl,
      title: videoTitle,
      visibility: videoVisibility,
      group: videoVisibility === "group" ? videoGroup : undefined,
    });
    setVideoUrl("");
    setVideoTitle("");
    setVideoVisibility("public");
    setShowAddVideo(false);
  };

  // Fetch user's standalone tactics for linking
  useEffect(() => {
    if (!showLinkTactic) return;
    getTactics({}).then((res) => setUserTactics(res.data.boards || [])).catch(() => {});
  }, [showLinkTactic]);

  const handleLinkTactic = async (tacticId) => {
    await onAddTactic({ tacticId });
    setShowLinkTactic(false);
  };

  // Build new tactic URL with drill context
  const newTacticUrl = `/tactics/new?${new URLSearchParams({
    drillDescription: drillDescription || "",
    drillTitle: drillTitle || "",
    drillId,
    contribution: "true",
  }).toString()}`;

  return (
    <div className="card mb-1">
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h3><FiVideo style={{ marginRight: "0.4rem" }} />{t("drills.mediaAndTactics")}</h3>
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddVideo(!showAddVideo)}>
            <FiVideo /> {t("drills.addVideo")}
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", margin: 0 }}>
            <FiImage /> {t("drills.addDrawing")}
            <input type="file" accept="image/*,.pdf" onChange={onAddDrawing} style={{ display: "none" }} />
          </label>
          <div style={{ position: "relative" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowLinkTactic(!showLinkTactic)}>
              <FiTarget /> {t("drills.addTactic")}
            </button>
            {showLinkTactic && (
              <div style={{
                position: "absolute", top: "100%", left: 0, zIndex: 10, marginTop: "0.25rem",
                background: "var(--color-card)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)", minWidth: 220, maxWidth: "calc(100vw - 2rem)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                <Link to={newTacticUrl} className="star-menu-item" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <FiPlus style={{ marginRight: "0.4rem" }} /> {t("drills.createNewTactic")}
                </Link>
                {userTactics.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--color-border)", maxHeight: 200, overflowY: "auto" }}>
                    {userTactics.map((tb) => (
                      <button key={tb._id} className="star-menu-item" onClick={() => handleLinkTactic(tb._id)}>
                        <FiTarget style={{ marginRight: "0.4rem" }} /> {tb.title || t("tactics.untitled")}
                      </button>
                    ))}
                  </div>
                )}
                {userTactics.length === 0 && (
                  <div className="star-menu-item text-sm text-muted">{t("drills.noPersonalTactics")}</div>
                )}
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onReport("drill", drillId)} title={t("drills.reportDrill")}>
            <FiFlag />
          </button>
        </div>
      </div>

      {showAddVideo && (
        <form onSubmit={handleSubmit} className="card mb-1" style={{ background: "var(--color-bg)" }}>
          <div className="form-group">
            <input className="form-control" placeholder={t("drills.videoUrlPlaceholder")} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
          </div>
          <div className="flex gap-sm">
            <input className="form-control" placeholder={t("drills.videoTitlePlaceholder")} value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} style={{ flex: 1 }} />
            <select className="form-control" value={videoVisibility} onChange={(e) => setVideoVisibility(e.target.value)} style={{ width: "auto" }}>
              <option value="public">{t("drills.visPublic")}</option>
              <option value="private">{t("drills.visPrivate")}</option>
              <option value="group">{t("drills.visGroup")}</option>
            </select>
            {videoVisibility === "group" && groups.length > 0 && (
              <select className="form-control" value={videoGroup} onChange={(e) => setVideoGroup(e.target.value)} style={{ width: "auto" }}>
                <option value="">{t("drills.selectGroup")}</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            )}
            <button type="submit" className="btn btn-primary btn-sm"><FiPlus /></button>
          </div>
        </form>
      )}

      {contributions.length === 0 ? (
        <p className="text-sm text-muted">{t("drills.noContributions")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {contributions.map((c) => (
            <div key={c._id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.75rem",
            }}>
              <div style={{ flex: 1 }}>
                {c.type === "video" ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm">
                    <FiVideo style={{ marginRight: "0.3rem" }} />
                    {c.title || c.url}
                  </a>
                ) : c.type === "tactic" ? (
                  <Link to={`/tactics/${c.tactic?._id || c.tactic}`} className="text-sm">
                    <FiTarget style={{ marginRight: "0.3rem" }} />
                    {c.title || c.tactic?.title || t("tactics.untitled")}
                    {c.tactic?.fieldType && (
                      <span className="text-muted" style={{ marginLeft: "0.5rem" }}>
                        {c.tactic.fieldType} · {c.tactic.homeTeam?.formation || ""} vs {c.tactic.awayTeam?.formation || ""}
                      </span>
                    )}
                  </Link>
                ) : (
                  <a href={c.filePath} target="_blank" rel="noopener noreferrer">
                    <img src={c.filePath} alt={c.title || "Drawing"} style={{ maxWidth: 200, borderRadius: "var(--radius)" }} />
                  </a>
                )}
                <div className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                  {c.createdBy?.name}
                  {c.visibility !== "public" && (
                    <span className="tag" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                      {c.visibility === "private" ? t("drills.visPrivate") : c.group?.name || t("drills.visGroup")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-secondary btn-sm" onClick={() => onReport("contribution", c._id)} title={t("drills.report")}>
                  <FiFlag />
                </button>
                {c.createdBy?._id === userId && (
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteContribution(c._id)}>
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
