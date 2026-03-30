import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiVideo, FiImage, FiFlag, FiPlus, FiTrash2 } from "react-icons/fi";

export default function DrillContributions({
  drillId, contributions, groups, userId,
  onAddVideo, onAddDrawing, onDeleteContribution, onReport,
}) {
  const { t } = useTranslation();
  const [showAddVideo, setShowAddVideo] = useState(false);
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

  return (
    <div className="card mb-1">
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h3><FiVideo style={{ marginRight: "0.4rem" }} />{t("drills.contributions")}</h3>
        <div className="flex gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddVideo(!showAddVideo)}>
            <FiVideo /> {t("drills.addVideo")}
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", margin: 0 }}>
            <FiImage /> {t("drills.addDrawing")}
            <input type="file" accept="image/*,.pdf" onChange={onAddDrawing} style={{ display: "none" }} />
          </label>
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
