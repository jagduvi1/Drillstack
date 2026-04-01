import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSketches, deleteSketch } from "../api/sketches";
import { FiPlus, FiTrash2, FiBox, FiEdit } from "react-icons/fi";

export default function SketchListPage() {
  const { t } = useTranslation();
  const [sketches, setSketches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSketches = () => {
    getSketches()
      .then((res) => setSketches(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSketches(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t("sketches.deleteConfirm"))) return;
    await deleteSketch(id);
    fetchSketches();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1><FiBox style={{ marginRight: "0.4rem" }} /> {t("sketches.title")}</h1>
        <Link to="/sketches/new" className="btn btn-primary">
          <FiPlus /> {t("sketches.newSketch")}
        </Link>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : sketches.length === 0 ? (
        <div className="text-center" style={{ padding: "3rem 1rem" }}>
          <FiBox style={{ fontSize: "2.5rem", color: "var(--color-muted)", marginBottom: "1rem" }} />
          <p>{t("sketches.noSketches")}</p>
          <Link to="/sketches/new" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
            <FiPlus /> {t("sketches.newSketch")}
          </Link>
        </div>
      ) : (
        <div className="drill-grid">
          {sketches.map((s) => (
            <div key={s._id} className="drill-card card" style={{ position: "relative" }}>
              <Link to={`/sketches/${s._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>{s.title || t("sketches.untitled")}</h3>
                  {s.sport && <span className="tag">{s.sport}</span>}
                </div>
                <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
                  <span className="tag">{(s.pieces || []).length} {t("sketches.pieces")}</span>
                  <span className="tag">{(s.arrows || []).length} {t("sketches.arrows")}</span>
                  {s.drill && <span className="tag">{s.drill.title}</span>}
                </div>
                <p className="text-xs text-muted" style={{ marginTop: "0.5rem" }}>
                  {new Date(s.updatedAt).toLocaleDateString()}
                </p>
              </Link>
              <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }} className="flex gap-sm">
                <Link to={`/sketches/${s._id}`} className="btn btn-sm btn-secondary"><FiEdit /></Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
