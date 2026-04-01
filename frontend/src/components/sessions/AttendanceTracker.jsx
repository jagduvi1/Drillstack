import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getPlayers } from "../../api/players";
import { getTrainers } from "../../api/trainers";
import { updateAttendance } from "../../api/sessions";
import { FiCheck, FiUsers, FiPlus, FiX, FiCheckSquare, FiSquare } from "react-icons/fi";

export default function AttendanceTracker({
  sessionId, groupId,
  initialAttendees, initialGuests,
  initialTrainerAttendees, initialGuestTrainers,
  onAttendanceChange,
}) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [present, setPresent] = useState(new Set((initialAttendees || []).map((a) => a?._id || a)));
  const [trainersPresent, setTrainersPresent] = useState(new Set((initialTrainerAttendees || []).map((a) => a?._id || a)));
  const [guests, setGuests] = useState((initialGuests || []).map((g, i) => ({ ...g, _tempId: `g-${i}` })));
  const [guestTrainersList, setGuestTrainersList] = useState((initialGuestTrainers || []).map((g, i) => ({ ...g, _tempId: `gt-${i}` })));
  const [guestName, setGuestName] = useState("");
  const [guestTrainerName, setGuestTrainerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    getPlayers(groupId).then((res) => setPlayers(res.data)).catch(() => {});
    getTrainers(groupId).then((res) => setTrainers(res.data)).catch(() => {});
  }, [groupId]);

  const notify = useCallback((presentSet, guestList, trainerSet, guestTrainers) => {
    onAttendanceChange?.({
      playerCount: presentSet.size + guestList.length,
      trainerCount: trainerSet.size + guestTrainers.length,
      attendees: [...presentSet],
      guestAttendees: guestList,
      trainerAttendees: [...trainerSet],
      guestTrainers,
    });
  }, [onAttendanceChange]);

  const togglePlayer = (playerId) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      notify(next, guests, trainersPresent, guestTrainersList);
      return next;
    });
    setSaved(false);
  };

  const toggleTrainer = (trainerId) => {
    setTrainersPresent((prev) => {
      const next = new Set(prev);
      if (next.has(trainerId)) next.delete(trainerId); else next.add(trainerId);
      notify(present, guests, next, guestTrainersList);
      return next;
    });
    setSaved(false);
  };

  const selectAllPlayers = () => {
    const all = new Set(players.map((p) => p._id));
    setPresent(all);
    notify(all, guests, trainersPresent, guestTrainersList);
    setSaved(false);
  };

  const deselectAllPlayers = () => {
    setPresent(new Set());
    notify(new Set(), guests, trainersPresent, guestTrainersList);
    setSaved(false);
  };

  const selectAllTrainers = () => {
    const all = new Set(trainers.map((tr) => tr._id));
    setTrainersPresent(all);
    notify(present, guests, all, guestTrainersList);
    setSaved(false);
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    const newGuests = [...guests, { name, position: "", _tempId: `g-${Date.now()}` }];
    setGuests(newGuests);
    setGuestName("");
    notify(present, newGuests, trainersPresent, guestTrainersList);
    setSaved(false);
  };

  const removeGuest = (tempId) => {
    const newGuests = guests.filter((g) => g._tempId !== tempId);
    setGuests(newGuests);
    notify(present, newGuests, trainersPresent, guestTrainersList);
    setSaved(false);
  };

  const addGuestTrainer = () => {
    const name = guestTrainerName.trim();
    if (!name) return;
    const newList = [...guestTrainersList, { name, role: "", _tempId: `gt-${Date.now()}` }];
    setGuestTrainersList(newList);
    setGuestTrainerName("");
    notify(present, guests, trainersPresent, newList);
    setSaved(false);
  };

  const removeGuestTrainer = (tempId) => {
    const newList = guestTrainersList.filter((g) => g._tempId !== tempId);
    setGuestTrainersList(newList);
    notify(present, guests, trainersPresent, newList);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateAttendance(sessionId, {
        attendees: [...present],
        guestAttendees: guests.map(({ name, position }) => ({ name, position })),
        trainerAttendees: [...trainersPresent],
        guestTrainers: guestTrainersList.map(({ name, role }) => ({ name, role })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (!groupId || (players.length === 0 && trainers.length === 0)) return null;

  const allPlayersSelected = players.length > 0 && present.size === players.length;
  const totalPlayers = present.size + guests.length;
  const totalTrainers = trainersPresent.size + guestTrainersList.length;

  return (
    <div className="attendance-tracker">
      {/* Header with save */}
      <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }}>
          <FiUsers style={{ marginRight: "0.3rem" }} />
          {t("players.attendance")} ({totalPlayers} {t("today.players").toLowerCase()}, {totalTrainers} {t("trainers.trainers").toLowerCase()})
        </h4>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          <FiCheck /> {saving ? "..." : saved ? t("settings.saved") : t("common.save")}
        </button>
      </div>

      {/* ── Players section ── */}
      {players.length > 0 && (
        <>
          <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
            <span className="text-sm" style={{ fontWeight: 600 }}>{t("today.players")} ({present.size}/{players.length})</span>
            <button className="btn btn-sm" style={{ padding: "0.1rem 0.3rem", fontSize: "0.7rem" }}
              onClick={allPlayersSelected ? deselectAllPlayers : selectAllPlayers}>
              {allPlayersSelected ? <FiSquare /> : <FiCheckSquare />}
            </button>
          </div>
          <div className="attendance-grid">
            {players.map((p) => (
              <button key={p._id} className={`attendance-player ${present.has(p._id) ? "present" : ""}`} onClick={() => togglePlayer(p._id)}>
                <span className="attendance-name">{p.name}</span>
                {p.position && <span className="attendance-pos">{p.position}</span>}
                {present.has(p._id) && <FiCheck className="attendance-check" />}
              </button>
            ))}
          </div>

          {/* Guest players */}
          {guests.length > 0 && (
            <div className="attendance-grid" style={{ marginTop: "0.35rem" }}>
              {guests.map((g) => (
                <div key={g._tempId} className="attendance-player present attendance-guest">
                  <span className="attendance-name">{g.name}</span>
                  <span className="attendance-pos">{t("players.guest")}</span>
                  <button className="attendance-guest-remove" onClick={() => removeGuest(g._tempId)}><FiX /></button>
                </div>
              ))}
            </div>
          )}
          <div className="attendance-add-guest">
            <input className="form-control form-control-sm" placeholder={t("players.guestName")}
              value={guestName} onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGuest()} maxLength={100} />
            <button className="btn btn-secondary btn-sm" onClick={addGuest} disabled={!guestName.trim()}>
              <FiPlus /> {t("players.addGuest")}
            </button>
          </div>
        </>
      )}

      {/* ── Trainers section ── */}
      {trainers.length > 0 && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
          <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
            <span className="text-sm" style={{ fontWeight: 600 }}>{t("trainers.trainers")} ({trainersPresent.size}/{trainers.length})</span>
            <button className="btn btn-sm" style={{ padding: "0.1rem 0.3rem", fontSize: "0.7rem" }}
              onClick={selectAllTrainers}>
              <FiCheckSquare />
            </button>
          </div>
          <div className="attendance-grid">
            {trainers.map((tr) => (
              <button key={tr._id} className={`attendance-player ${trainersPresent.has(tr._id) ? "present" : ""}`} onClick={() => toggleTrainer(tr._id)}>
                <span className="attendance-name">{tr.name}</span>
                {tr.role && <span className="attendance-pos">{tr.role}</span>}
                {trainersPresent.has(tr._id) && <FiCheck className="attendance-check" />}
              </button>
            ))}
          </div>

          {/* Guest trainers */}
          {guestTrainersList.length > 0 && (
            <div className="attendance-grid" style={{ marginTop: "0.35rem" }}>
              {guestTrainersList.map((g) => (
                <div key={g._tempId} className="attendance-player present attendance-guest">
                  <span className="attendance-name">{g.name}</span>
                  <span className="attendance-pos">{t("players.guest")}</span>
                  <button className="attendance-guest-remove" onClick={() => removeGuestTrainer(g._tempId)}><FiX /></button>
                </div>
              ))}
            </div>
          )}
          <div className="attendance-add-guest">
            <input className="form-control form-control-sm" placeholder={t("trainers.guestTrainerName")}
              value={guestTrainerName} onChange={(e) => setGuestTrainerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGuestTrainer()} maxLength={100} />
            <button className="btn btn-secondary btn-sm" onClick={addGuestTrainer} disabled={!guestTrainerName.trim()}>
              <FiPlus /> {t("trainers.addGuestTrainer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
