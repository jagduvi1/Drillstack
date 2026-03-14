import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, createSession, updateSession } from "../api/sessions";
import { getDrills } from "../api/drills";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const SECTION_TYPES = ["warmup", "main", "cooldown"];

const EMPTY_SESSION = {
  title: "",
  description: "",
  date: "",
  sport: "",
  sections: SECTION_TYPES.map((type) => ({ type, drills: [], notes: "" })),
};

export default function SessionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_SESSION);
  const [availableDrills, setAvailableDrills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDrills({ limit: 100 }).then((res) => setAvailableDrills(res.data.drills || []));
    if (isEdit) {
      getSession(id).then((res) => {
        const s = res.data;
        const sections = SECTION_TYPES.map((type) => {
          const existing = s.sections?.find((sec) => sec.type === type);
          return existing || { type, drills: [], notes: "" };
        });
        setForm({
          title: s.title || "",
          description: s.description || "",
          date: s.date ? s.date.slice(0, 10) : "",
          sport: s.sport || "",
          sections: sections.map((sec) => ({
            ...sec,
            drills: sec.drills.map((d) => ({
              drill: d.drill?._id || d.drill,
              duration: d.duration,
              notes: d.notes || "",
            })),
          })),
        });
      });
    }
  }, [id, isEdit]);

  const updateSection = (idx, field, value) => {
    const updated = [...form.sections];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, sections: updated });
  };

  const addDrillToSection = (sectionIdx, drillId) => {
    const drill = availableDrills.find((d) => d._id === drillId);
    if (!drill) return;
    const duration = parseInt(drill.setup?.duration, 10) || 10;
    const updated = [...form.sections];
    updated[sectionIdx].drills = [
      ...updated[sectionIdx].drills,
      { drill: drillId, duration, notes: "" },
    ];
    setForm({ ...form, sections: updated });
  };

  const removeDrillFromSection = (sectionIdx, drillIdx) => {
    const updated = [...form.sections];
    updated[sectionIdx].drills = updated[sectionIdx].drills.filter((_, i) => i !== drillIdx);
    setForm({ ...form, sections: updated });
  };

  const totalDuration = form.sections.reduce(
    (sum, s) => sum + s.drills.reduce((ds, d) => ds + (d.duration || 0), 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        date: form.date || undefined,
        sport: form.sport || undefined,
      };
      if (isEdit) {
        await updateSession(id, payload);
      } else {
        await createSession(payload);
      }
      navigate("/sessions");
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{isEdit ? "Edit Session" : "New Training Session"}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-1">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input className="form-control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sport</label>
              <input className="form-control" placeholder="e.g. football" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" placeholder="What's the goal of this session?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 50 }} />
          </div>
          <div className="text-sm text-muted">Total duration: <strong>{totalDuration} min</strong></div>
        </div>

        {form.sections.map((section, sIdx) => (
          <div key={section.type} className="card mb-1">
            <h3 style={{ textTransform: "capitalize", marginBottom: "0.75rem" }}>
              {section.type}
            </h3>

            {section.drills.map((d, dIdx) => {
              const drillInfo = availableDrills.find((ad) => ad._id === d.drill);
              return (
                <div key={dIdx} className="flex gap-sm mb-1" style={{ alignItems: "center" }}>
                  <span className="text-sm" style={{ minWidth: 150 }}>{drillInfo?.title || d.drill}</span>
                  <input
                    className="form-control"
                    type="number"
                    min={1}
                    style={{ width: 80 }}
                    value={d.duration}
                    onChange={(e) => {
                      const updated = [...form.sections];
                      updated[sIdx].drills[dIdx].duration = parseInt(e.target.value, 10) || 0;
                      setForm({ ...form, sections: updated });
                    }}
                  />
                  <span className="text-sm text-muted">min</span>
                  <input
                    className="form-control"
                    placeholder="Notes..."
                    style={{ flex: 1 }}
                    value={d.notes}
                    onChange={(e) => {
                      const updated = [...form.sections];
                      updated[sIdx].drills[dIdx].notes = e.target.value;
                      setForm({ ...form, sections: updated });
                    }}
                  />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDrillFromSection(sIdx, dIdx)}><FiTrash2 /></button>
                </div>
              );
            })}

            <div className="flex gap-sm">
              <select className="form-control" style={{ maxWidth: 300 }} defaultValue="" onChange={(e) => { if (e.target.value) { addDrillToSection(sIdx, e.target.value); e.target.value = ""; } }}>
                <option value=""><FiPlus /> Add drill...</option>
                {availableDrills.map((d) => (
                  <option key={d._id} value={d._id}>{d.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group mt-1">
              <label>Section Notes</label>
              <textarea className="form-control" value={section.notes} onChange={(e) => updateSection(sIdx, "notes", e.target.value)} style={{ minHeight: 50 }} />
            </div>
          </div>
        ))}

        <div className="flex gap-sm">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update Session" : "Create Session"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/sessions")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
