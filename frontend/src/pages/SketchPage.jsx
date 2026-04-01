import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSketch, createSketch, updateSketch } from "../api/sketches";
import { FiArrowLeft, FiSave, FiBox } from "react-icons/fi";

const DrillSketchEditor = lazy(() => import("../components/drills/sketch3d/DrillSketchEditor"));

export default function SketchPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [sketch, setSketch] = useState({ steps: [] });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [sketchId, setSketchId] = useState(id || null);

  useEffect(() => {
    if (!id) return;
    getSketch(id)
      .then((res) => {
        const s = res.data;
        setTitle(s.title || "");
        setSport(s.sport || "");
        setSketch({ steps: s.steps || [], pieces: s.pieces || [], arrows: s.arrows || [] });
      })
      .catch(() => navigate("/sketches"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const data = { title: title || t("sketches.untitled"), sport, ...sketch };
      if (sketchId) {
        await updateSketch(sketchId, data);
      } else {
        const res = await createSketch(data);
        setSketchId(res.data._id);
        navigate(`/sketches/${res.data._id}`, { replace: true });
      }
      setSaveMsg(t("settings.saved"));
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 1rem)", gap: "0.25rem", padding: "0.25rem 0.5rem" }}>
      {/* Header */}
      <div className="flex-between">
        <div className="flex gap-sm" style={{ alignItems: "center" }}>
          <Link to="/sketches" className="btn btn-secondary btn-sm"><FiArrowLeft /></Link>
          <input
            className="form-control form-control-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("sketches.untitled")}
            style={{ width: 200, fontWeight: 600 }}
          />
          <input
            className="form-control form-control-sm"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder={t("sessions.sportPlaceholder")}
            style={{ width: 120 }}
          />
        </div>
        <div className="flex gap-sm" style={{ alignItems: "center" }}>
          {saveMsg && <span className="text-sm text-muted">{saveMsg}</span>}
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      {/* 3D Editor — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={<div className="loading">{t("common.loading")}</div>}>
          <div style={{ height: "100%" }}>
            <DrillSketchEditor
              sketch={sketch}
              onChange={setSketch}
              fullHeight
              sport={sport}
            />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
