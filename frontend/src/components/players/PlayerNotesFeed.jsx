import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createPlayerNote, deletePlayerNote } from "../../api/players";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const CATEGORIES = ["general", "training", "match", "injury", "behavior"];

export default function PlayerNotesFeed({ groupId, playerId, notes: initialNotes }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(initialNotes || []);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await createPlayerNote(groupId, playerId, { content: content.trim(), category });
      setNotes((prev) => [res.data, ...prev]);
      setContent("");
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (noteId) => {
    try {
      await deletePlayerNote(groupId, playerId, noteId);
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="note-add-form" style={{ marginBottom: "0.75rem" }}>
        <div className="flex gap-sm" style={{ marginBottom: "0.35rem" }}>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder={t("playerProfile.addNote")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            style={{ flex: 1 }}
          />
        </div>
        <div className="flex gap-sm" style={{ alignItems: "center" }}>
          <select className="form-control form-control-sm" value={category}
            onChange={(e) => setCategory(e.target.value)} style={{ width: "auto" }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`playerProfile.noteCategory.${c}`, c)}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving || !content.trim()}>
            <FiPlus /> {saving ? "..." : t("common.add")}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted">{t("playerProfile.noNotes")}</p>
      ) : (
        <div className="notes-feed">
          {notes.map((n) => (
            <div key={n._id} className="note-item">
              <div className="flex-between" style={{ marginBottom: "0.2rem" }}>
                <div className="flex gap-sm" style={{ alignItems: "center" }}>
                  <span className={`tag tag-${n.category}`} style={{ fontSize: "0.6rem" }}>
                    {t(`playerProfile.noteCategory.${n.category}`, n.category)}
                  </span>
                  <span className="text-xs text-muted">
                    {n.createdBy?.name} &middot; {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button className="btn btn-sm" style={{ padding: "0.1rem 0.3rem", color: "var(--color-muted)" }}
                  onClick={() => handleDelete(n._id)}>
                  <FiTrash2 style={{ fontSize: "0.7rem" }} />
                </button>
              </div>
              <p className="text-sm" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
