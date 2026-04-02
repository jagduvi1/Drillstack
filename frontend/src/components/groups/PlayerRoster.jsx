import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPlayers, addPlayer, deletePlayer } from "../../api/players";
import { getPositionsForSport, getDualPositions, hasDualPositions, SPORTS_WITH_NUMBERS } from "../../constants/sportMetrics";
import { FiPlus, FiTrash2, FiUser } from "react-icons/fi";

export default memo(function PlayerRoster({ groupId, canEdit, sport }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newDefencePosition, setNewDefencePosition] = useState("");

  const positions = getPositionsForSport(sport);
  const dual = getDualPositions(sport);
  const isDual = hasDualPositions(sport);
  const hasNumbers = SPORTS_WITH_NUMBERS.includes(sport?.split("-")[0]);

  const fetchPlayers = () => {
    getPlayers(groupId)
      .then((res) => setPlayers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, [groupId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addPlayer(groupId, { name: newName.trim(), position: newPosition.trim(), defencePosition: newDefencePosition.trim() });
    setNewName("");
    setNewPosition("");
    setNewDefencePosition("");
    setShowAdd(false);
    fetchPlayers();
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm(t("players.deleteConfirm"))) return;
    await deletePlayer(groupId, playerId);
    fetchPlayers();
  };

  if (loading) return <p className="text-sm text-muted">{t("common.loading")}</p>;

  return (
    <div className="card mb-1">
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <h3><FiUser style={{ marginRight: "0.4rem" }} />{t("players.title", { count: players.length })}</h3>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <FiPlus /> {t("players.addPlayer")}
          </button>
        )}
      </div>

      {/* Add player form */}
      {showAdd && canEdit && (
        <form onSubmit={handleAdd} className="flex gap-sm mb-1" style={{ flexWrap: "wrap" }}>
          <input className="form-control" placeholder={t("players.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ flex: 1, minWidth: 120 }} />
          {isDual ? (
            <>
              <select className="form-control" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 160 }}>
                <option value="">{t("players.offencePosition")}</option>
                {dual.offence.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="form-control" value={newDefencePosition} onChange={(e) => setNewDefencePosition(e.target.value)} style={{ width: 180 }}>
                <option value="">{t("players.defencePosition")}</option>
                {dual.defence.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          ) : positions.length > 0 ? (
            <select className="form-control" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 180 }}>
              <option value="">{t("players.positionPlaceholder")}</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input className="form-control" placeholder={t("players.positionPlaceholder")} value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 120 }} />
          )}
          <button type="submit" className="btn btn-primary btn-sm"><FiPlus /></button>
        </form>
      )}

      {/* Player list */}
      {players.length === 0 ? (
        <p className="text-sm text-muted">{t("players.noPlayers")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {players.map((p) => {
            const age = p.dateOfBirth
              ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null;
            return (
              <Link key={p._id} to={`/groups/${groupId}/players/${p._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{
                  background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-primary)" }}>
                      {hasNumbers && p.number ? `#${p.number} ` : ""}{p.name}
                    </span>
                    {canEdit && (
                      <button className="btn btn-danger btn-sm" onClick={(e) => { e.preventDefault(); handleDelete(p._id); }} style={{ padding: "0.15rem 0.4rem" }}>
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-sm" style={{ marginTop: "0.25rem", flexWrap: "wrap" }}>
                    {p.position && <span className="tag" style={{ fontSize: "0.65rem" }}>{p.position}</span>}
                    {p.defencePosition && <span className="tag" style={{ fontSize: "0.65rem" }}>{p.defencePosition}</span>}
                    {age !== null && <span className="tag" style={{ fontSize: "0.65rem" }}>{t("playerProfile.age", { age })}</span>}
                    {p.height && <span className="tag" style={{ fontSize: "0.65rem" }}>{p.height} cm</span>}
                    {p.weight && <span className="tag" style={{ fontSize: "0.65rem" }}>{p.weight} kg</span>}
                    {p.strengths?.[0] && <span className="tag tag-success" style={{ fontSize: "0.65rem" }}>{p.strengths[0]}</span>}
                    {p.weaknesses?.[0] && <span className="tag" style={{ fontSize: "0.65rem", background: "#fee2e2", color: "#991b1b" }}>{p.weaknesses[0]}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
});
