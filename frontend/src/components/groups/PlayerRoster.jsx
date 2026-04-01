import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPlayers, addPlayer, updatePlayer, deletePlayer } from "../../api/players";
import { getPositionsForSport, getDualPositions, hasDualPositions, SPORTS_WITH_NUMBERS } from "../../constants/sportMetrics";
import { FiPlus, FiTrash2, FiEdit, FiChevronDown, FiChevronUp, FiUser } from "react-icons/fi";

export default memo(function PlayerRoster({ groupId, canEdit, sport }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newDefencePosition, setNewDefencePosition] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});

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

  const handleUpdate = async (playerId) => {
    await updatePlayer(groupId, playerId, editData);
    setExpandedId(null);
    setEditData({});
    fetchPlayers();
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm(t("players.deleteConfirm"))) return;
    await deletePlayer(groupId, playerId);
    fetchPlayers();
  };

  const toggleExpand = (player) => {
    if (expandedId === player._id) {
      setExpandedId(null);
    } else {
      setExpandedId(player._id);
      setEditData({
        name: player.name,
        position: player.position || "",
        defencePosition: player.defencePosition || "",
        number: player.number || "",
        birthYear: player.birthYear || "",
        strengths: player.strengths || [],
        weaknesses: player.weaknesses || [],
        notes: player.notes || "",
      });
    }
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
              <select className="form-control" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 150 }}>
                <option value="">{t("players.offencePosition", "Offence position")}</option>
                {dual.offence.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="form-control" value={newDefencePosition} onChange={(e) => setNewDefencePosition(e.target.value)} style={{ width: 150 }}>
                <option value="">{t("players.defencePosition", "Defence position")}</option>
                {dual.defence.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          ) : positions.length > 0 ? (
            <select className="form-control" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 150 }}>
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
          {players.map((p) => (
            <div key={p._id}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem",
                cursor: canEdit ? "pointer" : "default",
              }} onClick={() => canEdit && toggleExpand(p)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {p.number && <span className="tag" style={{ minWidth: 28, textAlign: "center" }}>{p.number}</span>}
                  <Link to={`/groups/${groupId}/players/${p._id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-primary)", textDecoration: "none" }}>
                    {p.name}
                  </Link>
                  {p.position && <span className="text-sm text-muted">{p.position}</span>}
                  {p.defencePosition && <span className="text-sm text-muted">/ {p.defencePosition}</span>}
                </div>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  {p.skillRating !== null && p.skillRating !== undefined && (
                    <span className="tag" style={{ fontSize: "0.65rem", background: "var(--color-primary)", color: "#fff" }}>{p.skillRating}</span>
                  )}
                  {p.strengths?.length > 0 && <span className="tag tag-success" style={{ fontSize: "0.65rem" }}>{p.strengths.length} {t("players.strengths")}</span>}
                  {canEdit && (expandedId === p._id ? <FiChevronUp /> : <FiChevronDown />)}
                </div>
              </div>

              {/* Expanded edit view */}
              {expandedId === p._id && canEdit && (
                <div style={{ background: "var(--color-bg)", borderRadius: "0 0 var(--radius) var(--radius)", padding: "0.75rem", marginTop: -2 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isDual ? "1fr 1fr" : hasNumbers ? "1fr 1fr 1fr" : "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input className="form-control form-control-sm" placeholder={t("players.name")} value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    {isDual ? (
                      <>
                        <select className="form-control form-control-sm" value={editData.position || ""} onChange={(e) => setEditData({ ...editData, position: e.target.value })}>
                          <option value="">{t("players.offencePosition", "Offence position")}</option>
                          {dual.offence.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        <select className="form-control form-control-sm" value={editData.defencePosition || ""} onChange={(e) => setEditData({ ...editData, defencePosition: e.target.value })}>
                          <option value="">{t("players.defencePosition", "Defence position")}</option>
                          {dual.defence.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                      </>
                    ) : positions.length > 0 ? (
                      <select className="form-control form-control-sm" value={editData.position || ""} onChange={(e) => setEditData({ ...editData, position: e.target.value })}>
                        <option value="">{t("players.positionPlaceholder")}</option>
                        {positions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    ) : (
                      <input className="form-control form-control-sm" placeholder={t("players.position")} value={editData.position || ""} onChange={(e) => setEditData({ ...editData, position: e.target.value })} />
                    )}
                    {hasNumbers && (
                      <input className="form-control form-control-sm" type="number" placeholder={t("players.number")} value={editData.number || ""} onChange={(e) => setEditData({ ...editData, number: e.target.value })} />
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                    <label className="text-sm">{t("players.strengths")}</label>
                    <input className="form-control form-control-sm" placeholder={t("players.strengthsPlaceholder")} value={(editData.strengths || []).join(", ")}
                      onChange={(e) => setEditData({ ...editData, strengths: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                    <label className="text-sm">{t("players.weaknesses")}</label>
                    <input className="form-control form-control-sm" placeholder={t("players.weaknessesPlaceholder")} value={(editData.weaknesses || []).join(", ")}
                      onChange={(e) => setEditData({ ...editData, weaknesses: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                    <label className="text-sm">{t("players.notes")}</label>
                    <textarea className="form-control form-control-sm" value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} style={{ minHeight: 40 }} />
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(p._id)}>{t("common.save")}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 /> {t("common.delete")}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
