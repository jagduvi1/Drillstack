import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import useFetch from "../hooks/useFetch";
import { getTactics, deleteTactic } from "../api/tactics";

export default function TacticBoardListPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useFetch(() => getTactics(), []);
  const boards = data?.boards || [];

  const handleDelete = async (id) => {
    if (!window.confirm(t("tactics.confirmDelete"))) return;
    await deleteTactic(id).catch(() => {});
    refetch();
  };

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>{t("tactics.title")}</h1>
        <Link to="/tactics/new" className="btn btn-primary">
          <FiPlus /> {t("tactics.newBoard")}
        </Link>
      </div>

      {boards.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="text-muted">{t("tactics.noBoards")}</p>
          <Link to="/tactics/new" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            <FiPlus /> {t("tactics.newBoard")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {boards.map((b) => (
            <div key={b._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link to={`/tactics/${b._id}`} style={{ flex: 1 }}>
                <strong>{b.title || t("tactics.untitled")}</strong>
                <div className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                  {b.fieldType === "half" ? t("tactics.fieldHalf") : b.fieldType === "third" ? t("tactics.fieldThird") : t("tactics.fieldFull")}
                  {" · "}
                  {b.homeTeam?.formation || "4-4-2"} vs {b.awayTeam?.formation || "4-4-2"}
                  {" · "}
                  {new Date(b.updatedAt).toLocaleDateString()}
                </div>
              </Link>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(b._id)}
                title={t("common.delete")}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
