import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useFetch from "../hooks/useFetch";
import { getSessions, deleteSession } from "../api/sessions";
import { FiPlus } from "react-icons/fi";

export default function SessionsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useFetch(() => getSessions({ page }), [page]);

  const handleDelete = async (id) => {
    if (!window.confirm(t("sessions.deleteSession"))) return;
    await deleteSession(id);
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{t("sessions.title")}</h1>
        <Link to="/sessions/new" className="btn btn-primary"><FiPlus /> {t("sessions.newSession")}</Link>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t("sessions.tableTitle")}</th><th>{t("sessions.tableDate")}</th><th>{t("sessions.tableDuration")}</th><th></th></tr>
              </thead>
              <tbody>
                {data?.sessions?.map((s) => (
                  <tr key={s._id}>
                    <td><Link to={`/sessions/${s._id}`}>{s.title}</Link></td>
                    <td>{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                    <td>{s.totalDuration} min</td>
                    <td>
                      <div className="flex gap-sm">
                        <Link to={`/sessions/${s._id}/edit`} className="btn btn-secondary btn-sm">{t("common.edit")}</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>{t("common.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.sessions?.length && (
                  <tr><td colSpan={4} className="text-muted" style={{ textAlign: "center" }}>{t("sessions.noSessions")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.pages > 1 && (
        <div className="flex gap-sm mt-1" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("common.prev")}</button>
          <span className="text-sm text-muted">{t("common.page", { page: data.page, pages: data.pages })}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t("common.next")}</button>
        </div>
      )}
    </div>
  );
}
