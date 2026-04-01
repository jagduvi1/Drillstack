import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getPlayers } from "../../api/players";
import { updateAttendance } from "../../api/sessions";
import { FiCheck, FiUsers, FiPlus, FiX, FiCheckSquare, FiSquare } from "react-icons/fi";

export default function AttendanceTracker({ sessionId, groupId, initialAttendees, initialGuests, onAttendanceChange }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [present, setPresent] = useState(new Set((initialAttendees || []).map((a) => a?._id || a)));
  const [guests, setGuests] = useState((initialGuests || []).map((g, i) => ({ ...g, _tempId: `g-${i}` })));
  const [guestName, setGuestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    getPlayers(groupId).then((res) => setPlayers(res.data)).catch(() => {});
  }, [groupId]);

  // Notify parent of attendance changes
  const notify = useCallback((presentSet, guestList) => {
    onAttendanceChange?.({
      playerCount: presentSet.size + guestList.length,
      attendees: [...presentSet],
      guestAttendees: guestList,
    });
  }, [onAttendanceChange]);

  const toggle = (playerId) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      notify(next, guests);
      return next;
    });
    setSaved(false);
  };

  const selectAll = () => {
    const all = new Set(players.map((p) => p._id));
    setPresent(all);
    notify(all, guests);
    setSaved(false);
  };

  const deselectAll = () => {
    setPresent(new Set());
    notify(new Set(), guests);
    setSaved(false);
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    const newGuests = [...guests, { name, position: "", _tempId: `g-${Date.now()}` }];
    setGuests(newGuests);
    setGuestName("");
    notify(present, newGuests);
    setSaved(false);
  };

  const removeGuest = (tempId) => {
    const newGuests = guests.filter((g) => g._tempId !== tempId);
    setGuests(newGuests);
    notify(present, newGuests);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const guestData = guests.map(({ name, position }) => ({ name, position }));
      await updateAttendance(sessionId, [...present], guestData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (!groupId || players.length === 0) return null;

  const allSelected = players.length > 0 && present.size === players.length;
  const totalPresent = present.size + guests.length;

  return (
    <div className="attendance-tracker">
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }}>
          <FiUsers style={{ marginRight: "0.3rem" }} />
          {t("players.attendance")} ({totalPresent}/{players.length + guests.length})
        </h4>
        <div className="flex gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={allSelected ? deselectAll : selectAll}>
            {allSelected ? <FiSquare /> : <FiCheckSquare />}
            {allSelected ? t("players.deselectAll") : t("players.selectAll")}
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            <FiCheck /> {saving ? "..." : saved ? t("settings.saved") : t("common.save")}
          </button>
        </div>
      </div>

      {/* Roster players */}
      <div className="attendance-grid">
        {players.map((p) => (
          <button
            key={p._id}
            className={`attendance-player ${present.has(p._id) ? "present" : ""}`}
            onClick={() => toggle(p._id)}
          >
            <span className="attendance-name">{p.name}</span>
            {p.position && <span className="attendance-pos">{p.position}</span>}
            {present.has(p._id) && <FiCheck className="attendance-check" />}
          </button>
        ))}
      </div>

      {/* Guest players */}
      {guests.length > 0 && (
        <div className="attendance-grid" style={{ marginTop: "0.5rem" }}>
          {guests.map((g) => (
            <div key={g._tempId} className="attendance-player present attendance-guest">
              <span className="attendance-name">{g.name}</span>
              <span className="attendance-pos">{t("players.guest")}</span>
              <button className="attendance-guest-remove" onClick={() => removeGuest(g._tempId)} title={t("players.removeGuest")}>
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add guest input */}
      <div className="attendance-add-guest">
        <input
          className="form-control form-control-sm"
          placeholder={t("players.guestName")}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGuest()}
          maxLength={100}
        />
        <button className="btn btn-secondary btn-sm" onClick={addGuest} disabled={!guestName.trim()}>
          <FiPlus /> {t("players.addGuest")}
        </button>
      </div>
    </div>
  );
}
