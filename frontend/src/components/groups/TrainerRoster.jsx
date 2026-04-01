import { useState, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { getTrainers, addTrainer, updateTrainer, deleteTrainer } from "../../api/trainers";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiUsers } from "react-icons/fi";

export default memo(function TrainerRoster({ groupId, canEdit }) {
  const { t } = useTranslation();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchTrainers = () => {
    getTrainers(groupId)
      .then((res) => setTrainers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTrainers(); }, [groupId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addTrainer(groupId, { name: newName.trim(), role: newRole.trim() });
    setNewName("");
    setNewRole("");
    setShowAdd(false);
    fetchTrainers();
  };

  const handleUpdate = async (trainerId) => {
    await updateTrainer(groupId, trainerId, editData);
    setExpandedId(null);
    setEditData({});
    fetchTrainers();
  };

  const handleDelete = async (trainerId) => {
    if (!window.confirm(t("trainers.deleteConfirm"))) return;
    await deleteTrainer(groupId, trainerId);
    fetchTrainers();
  };

  const toggleExpand = (trainer) => {
    if (expandedId === trainer._id) {
      setExpandedId(null);
    } else {
      setExpandedId(trainer._id);
      setEditData({
        name: trainer.name,
        role: trainer.role || "",
        specialization: trainer.specialization || "",
        certifications: trainer.certifications || [],
        phone: trainer.phone || "",
        email: trainer.email || "",
        notes: trainer.notes || "",
      });
    }
  };

  if (loading) return <p className="text-sm text-muted">{t("common.loading")}</p>;

  return (
    <div className="card mb-1">
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <h3><FiUsers style={{ marginRight: "0.4rem" }} />{t("trainers.title", { count: trainers.length })}</h3>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <FiPlus /> {t("trainers.addTrainer")}
          </button>
        )}
      </div>

      {showAdd && canEdit && (
        <form onSubmit={handleAdd} className="flex gap-sm mb-1">
          <input className="form-control" placeholder={t("trainers.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ flex: 1 }} />
          <input className="form-control" placeholder={t("trainers.rolePlaceholder")} value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: 150 }} />
          <button type="submit" className="btn btn-primary btn-sm"><FiPlus /></button>
        </form>
      )}

      {trainers.length === 0 ? (
        <p className="text-sm text-muted">{t("trainers.noTrainers")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {trainers.map((tr) => (
            <div key={tr._id}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem",
                cursor: canEdit ? "pointer" : "default",
              }} onClick={() => canEdit && toggleExpand(tr)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <strong className="text-sm">{tr.name}</strong>
                  {tr.role && <span className="tag" style={{ fontSize: "0.65rem" }}>{tr.role}</span>}
                </div>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  {tr.certifications?.length > 0 && (
                    <span className="tag" style={{ fontSize: "0.65rem" }}>{tr.certifications.length} {t("trainers.certs")}</span>
                  )}
                  {canEdit && (expandedId === tr._id ? <FiChevronUp /> : <FiChevronDown />)}
                </div>
              </div>

              {expandedId === tr._id && canEdit && (
                <div style={{ background: "var(--color-bg)", borderRadius: "0 0 var(--radius) var(--radius)", padding: "0.75rem", marginTop: -2 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input className="form-control form-control-sm" placeholder={t("trainers.name")} value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("trainers.rolePlaceholder")} value={editData.role || ""} onChange={(e) => setEditData({ ...editData, role: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("trainers.specialization")} value={editData.specialization || ""} onChange={(e) => setEditData({ ...editData, specialization: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("trainers.phone")} value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("trainers.email")} value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                    <input className="form-control form-control-sm" placeholder={t("trainers.certPlaceholder")}
                      value={(editData.certifications || []).join(", ")}
                      onChange={(e) => setEditData({ ...editData, certifications: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                  <textarea className="form-control form-control-sm" rows={2} placeholder={t("trainers.notes")}
                    value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                  <div className="flex gap-sm mt-1">
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(tr._id)}>{t("common.save")}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tr._id)}><FiTrash2 /> {t("common.delete")}</button>
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
