import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPlayers, addPlayer, updatePlayer, deletePlayer } from "../../api/players";
import { FiPlus, FiTrash2, FiEdit, FiChevronDown, FiChevronUp, FiUser } from "react-icons/fi";

export default function PlayerRoster({ groupId, canEdit }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});

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
    await addPlayer(groupId, { name: newName.trim(), position: newPosition.trim() });
    setNewName("");
    setNewPosition("");
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
        <form onSubmit={handleAdd} className="flex gap-sm mb-1">
          <input className="form-control" placeholder={t("players.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ flex: 1 }} />
          <input className="form-control" placeholder={t("players.positionPlaceholder")} value={newPosition} onChange={(e) => setNewPosition(e.target.value)} style={{ width: 120 }} />
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
                  <strong className="text-sm">{p.name}</strong>
                  {p.position && <span className="text-sm text-muted">{p.position}</span>}
                </div>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  {p.strengths?.length > 0 && <span className="tag tag-success" style={{ fontSize: "0.65rem" }}>{p.strengths.length} {t("players.strengths")}</span>}
                  {canEdit && (expandedId === p._id ? <FiChevronUp /> : <FiChevronDown />)}
                </div>
              </div>

              {/* Expanded edit view */}
              {expandedId === p._id && canEdit && (
                <div style={{ background: "var(--color-bg)", borderRadius: "0 0 var(--radius) var(--radius)", padding: "0.75rem", marginTop: -2 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input className="form-control form-control-sm" placeholder={t("players.name")} value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("players.position")} value={editData.position || ""} onChange={(e) => setEditData({ ...editData, position: e.target.value })} />
                    <input className="form-control form-control-sm" type="number" placeholder={t("players.number")} value={editData.number || ""} onChange={(e) => setEditData({ ...editData, number: e.target.value })} />
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
}
