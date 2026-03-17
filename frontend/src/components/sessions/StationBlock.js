import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export default function StationBlock({ block, onChange, onPickDrillForStation, onPreviewDrill }) {
  const { t } = useTranslation();
  const setField = (field, value) => onChange({ ...block, [field]: value });

  const updateStationCount = (count) => {
    const stations = [...(block.stations || [])];
    // Add new stations if count increased
    while (stations.length < count) {
      stations.push({ stationNumber: stations.length + 1, drill: null, notes: "" });
    }
    // Remove extra stations if count decreased
    if (stations.length > count) stations.length = count;
    // Fix numbering
    stations.forEach((s, i) => (s.stationNumber = i + 1));
    onChange({ ...block, stationCount: count, stations });
  };

  const updateStation = (idx, field, value) => {
    const stations = [...block.stations];
    stations[idx] = { ...stations[idx], [field]: value };
    onChange({ ...block, stations });
  };

  const totalTime = (block.stationCount || 0) * (block.rotationMinutes || 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div className="form-group">
          <label className="text-sm">{t("blocks.stationsLabel")}</label>
          <input
            type="number"
            className="form-control form-control-sm"
            value={block.stationCount || 0}
            onChange={(e) => updateStationCount(parseInt(e.target.value, 10) || 0)}
            min={1}
            max={20}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">{t("blocks.rotationMinutes")}</label>
          <input
            type="number"
            className="form-control form-control-sm"
            value={block.rotationMinutes || 0}
            onChange={(e) =>
              setField("rotationMinutes", parseInt(e.target.value, 10) || 0)
            }
            min={1}
          />
        </div>
        <div className="form-group">
          <label className="text-sm">{t("blocks.totalTime")}</label>
          <div className="text-sm" style={{ padding: "0.4rem 0", fontWeight: 600 }}>
            {totalTime} min
          </div>
        </div>
      </div>

      {(block.stations || []).length > 0 && (
        <div className="station-grid">
          {block.stations.map((s, i) => (
            <div key={i} className="station-card">
              <div className="station-number">{t("sessions.station", { number: s.stationNumber })}</div>
              {s._drillTitle || s.drill?.title ? (
                <div>
                  <button
                    type="button"
                    className="drill-name-link"
                    onClick={() => onPreviewDrill(s.drill)}
                    title={t("blocks.viewDrillDetails")}
                  >
                    {s._drillTitle || s.drill?.title || "—"}
                  </button>
                  <div className="flex gap-sm" style={{ justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onPickDrillForStation(i)}
                    >
                      {t("common.change")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        const stations = [...block.stations];
                        stations[i] = { ...stations[i], drill: null, _drillTitle: "" };
                        onChange({ ...block, stations });
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPickDrillForStation(i)}
                >
                  <FiPlus /> {t("blocks.pickDrill")}
                </button>
              )}
              <input
                className="form-control form-control-sm mt-1"
                placeholder={t("blocks.stationNotes")}
                value={s.notes}
                onChange={(e) => updateStation(i, "notes", e.target.value)}
                style={{ fontSize: "0.75rem" }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="form-group mt-1">
        <input
          className="form-control form-control-sm"
          placeholder={t("blocks.blockNotes")}
          value={block.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
