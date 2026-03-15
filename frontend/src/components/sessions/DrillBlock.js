import { FiPlus, FiTrash2 } from "react-icons/fi";

export default function DrillBlock({ block, onChange, onPickDrill }) {
  const updateDrill = (idx, field, value) => {
    const updated = [...block.drills];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...block, drills: updated });
  };

  const removeDrill = (idx) => {
    onChange({ ...block, drills: block.drills.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      {block.drills.length > 0 && (
        <table className="block-drill-table">
          <thead>
            <tr>
              <th>Drill</th>
              <th style={{ width: 90 }}>Minutes</th>
              <th>Notes</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {block.drills.map((d, i) => (
              <tr key={i}>
                <td className="text-sm">
                  {d._drillTitle || d.drill?.title || d.drill || "—"}
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={d.duration}
                    onChange={(e) =>
                      updateDrill(i, "duration", parseInt(e.target.value, 10) || 0)
                    }
                    min={0}
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={d.notes}
                    onChange={(e) => updateDrill(i, "notes", e.target.value)}
                    placeholder="Optional notes"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeDrill(i)}
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-1"
        onClick={onPickDrill}
      >
        <FiPlus /> Add Drill
      </button>
      <div className="form-group mt-1">
        <input
          className="form-control form-control-sm"
          placeholder="Block notes (optional)"
          value={block.notes}
          onChange={(e) => onChange({ ...block, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
