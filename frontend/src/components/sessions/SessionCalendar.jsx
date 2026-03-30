import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSessions } from "../../api/sessions";
import { FiChevronLeft, FiChevronRight, FiPlus, FiClock, FiPlay } from "react-icons/fi";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatMonth(date, locale) {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export default function SessionCalendar({ mode = "week" }) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(mode); // "week" or "month"

  // Compute date range for current view
  const { days, dateFrom, dateTo } = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      const d = [];
      for (let i = 0; i < 7; i++) d.push(addDays(start, i));
      return { days: d, dateFrom: d[0], dateTo: d[6] };
    }
    // Month view
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const d = [];
    let cur = start;
    while (cur <= last || d.length % 7 !== 0) {
      d.push(new Date(cur));
      cur = addDays(cur, 1);
      if (d.length > 42) break; // safety
    }
    return { days: d, dateFrom: d[0], dateTo: d[d.length - 1] };
  }, [currentDate, viewMode]);

  // Fetch sessions for visible range
  useEffect(() => {
    setLoading(true);
    const from = dateFrom.toISOString().split("T")[0];
    const to = dateTo.toISOString().split("T")[0];
    getSessions({ dateFrom: from, dateTo: to, limit: 100 })
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // Group sessions by date string
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (!s.date) continue;
      const key = new Date(s.date).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  const navigate = (dir) => {
    const offset = viewMode === "week" ? 7 : 1;
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * offset);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const weekDayNames = useMemo(() => {
    const names = [];
    const d = startOfWeek(new Date());
    for (let i = 0; i < 7; i++) {
      names.push(addDays(d, i).toLocaleDateString(i18n.language, { weekday: "short" }));
    }
    return names;
  }, [i18n.language]);

  return (
    <div className="session-calendar">
      {/* Header */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><FiChevronLeft /></button>
          <button className="btn btn-secondary btn-sm cal-today-btn" onClick={goToday}>{t("calendar.today")}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(1)}><FiChevronRight /></button>
        </div>
        <h3 className="cal-title">{formatMonth(currentDate, i18n.language)}</h3>
        <div className="cal-view-toggle">
          <button className={`btn btn-sm ${viewMode === "week" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("week")}>{t("calendar.week")}</button>
          <button className={`btn btn-sm ${viewMode === "month" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("month")}>{t("calendar.month")}</button>
        </div>
      </div>

      {/* Day name headers */}
      <div className="cal-grid cal-day-names">
        {weekDayNames.map((name, i) => (
          <div key={i} className="cal-day-name">{name}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`cal-grid ${viewMode === "month" ? "cal-month" : "cal-week"}`}>
        {days.map((day) => {
          const key = day.toISOString().split("T")[0];
          const daySessions = sessionsByDate[key] || [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div key={key} className={`cal-day ${isToday ? "cal-today" : ""} ${!isCurrentMonth && viewMode === "month" ? "cal-other-month" : ""}`}>
              <div className="cal-day-header">
                <span className={`cal-day-num ${isToday ? "cal-today-num" : ""}`}>
                  {day.getDate()}
                </span>
                <Link to={`/sessions/new?date=${key}`} className="cal-add-btn" title={t("calendar.addSession")}>
                  <FiPlus />
                </Link>
              </div>
              <div className="cal-day-sessions">
                {daySessions.map((s) => (
                  <Link key={s._id} to={isToday ? `/today` : `/sessions/${s._id}`} className="cal-session-item">
                    <span className="cal-session-title">{s.title}</span>
                    {s.totalDuration > 0 && (
                      <span className="cal-session-duration"><FiClock /> {s.totalDuration}m</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading && <div className="cal-loading">{t("common.loading")}</div>}
    </div>
  );
}
