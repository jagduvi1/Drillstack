import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { getDrill, deleteDrill, uploadDiagram, addReflection } from "../api/drills";
import TagBadge from "../components/common/TagBadge";

export default function DrillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: drill, loading, refetch } = useFetch(() => getDrill(id), [id]);
  const [reflectionNote, setReflectionNote] = useState("");

  if (loading) return <div className="loading">Loading...</div>;
  if (!drill) return <div className="alert alert-danger">Drill not found</div>;

  const handleDelete = async () => {
    if (!window.confirm("Delete this drill?")) return;
    await deleteDrill(id);
    navigate("/drills");
  };

  const handleDiagramUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("diagram", file);
    await uploadDiagram(id, fd);
    refetch();
  };

  const handleAddReflection = async () => {
    if (!reflectionNote.trim()) return;
    await addReflection(id, reflectionNote.trim());
    setReflectionNote("");
    refetch();
  };

  return (
    <div>
      <div className="flex-between mb-1">
        <h1>{drill.title}</h1>
        <div className="flex gap-sm">
          <Link to={`/drills/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="card mb-1">
        <h3>Purpose</h3>
        <p>{drill.purpose}</p>
        <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
          {drill.sport && <TagBadge name={drill.sport} category="sport" />}
          <TagBadge name={drill.intensity} category="intensity" />
          <TagBadge name={`${drill.duration} min`} category="duration" />
          {drill.gameForm?.format && <TagBadge name={drill.gameForm.format} category="game form" />}
        </div>
      </div>

      {drill.instructionFocus?.active?.taxonomy && (
        <div className="card mb-1">
          <h3>Instruction Focus</h3>
          <p><strong>{drill.instructionFocus.active.taxonomy.name}</strong></p>
          {drill.instructionFocus.active.description && <p className="text-muted">{drill.instructionFocus.active.description}</p>}
        </div>
      )}

      {drill.tags?.length > 0 && (
        <div className="card mb-1">
          <h3>Tags</h3>
          <div className="flex gap-sm" style={{ flexWrap: "wrap", marginTop: "0.5rem" }}>
            {drill.tags.map((t, i) => (
              <TagBadge key={i} category={t.category} name={t.taxonomy?.name || t.category} />
            ))}
          </div>
        </div>
      )}

      {drill.guidedQuestions?.length > 0 && (
        <div className="card mb-1">
          <h3>Guided Discovery Questions</h3>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            {drill.guidedQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>
      )}

      {drill.rules?.length > 0 && (
        <div className="card mb-1">
          <h3>Rules & Constraints</h3>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            {drill.rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {drill.successCriteria?.length > 0 && (
        <div className="card mb-1">
          <h3>Success Criteria</h3>
          {drill.successCriteria.map((sc, i) => (
            <div key={i} className="mb-1"><strong>{sc.type}:</strong> {sc.description}</div>
          ))}
        </div>
      )}

      {drill.commonMistakes?.length > 0 && (
        <div className="card mb-1">
          <h3>Common Mistakes</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mistake</th><th>Correction</th></tr></thead>
              <tbody>
                {drill.commonMistakes.map((m, i) => (
                  <tr key={i}><td>{m.mistake}</td><td>{m.correction}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drill.variations?.length > 0 && (
        <div className="card mb-1">
          <h3>Variations & Progressions</h3>
          {drill.variations.map((v, i) => (
            <div key={i} className="section-block">
              <h4>{v.title}</h4>
              <p className="text-sm">{v.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Diagrams */}
      <div className="card mb-1">
        <h3>Diagrams</h3>
        <div className="flex gap-sm mt-1" style={{ flexWrap: "wrap" }}>
          {drill.diagrams?.map((d, i) => (
            <img key={i} src={d} alt={`Diagram ${i + 1}`} style={{ maxWidth: 300, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
          ))}
        </div>
        <div className="mt-1">
          <input type="file" accept="image/*" onChange={handleDiagramUpload} />
        </div>
      </div>

      {/* Reflection Notes */}
      <div className="card mb-1">
        <h3>Reflection Notes</h3>
        {drill.reflectionNotes?.map((r, i) => (
          <div key={i} className="section-block">
            <div className="text-sm text-muted">{new Date(r.date).toLocaleDateString()}</div>
            <p>{r.note}</p>
          </div>
        ))}
        <div className="flex gap-sm mt-1">
          <textarea className="form-control" placeholder="Add a reflection..." value={reflectionNote} onChange={(e) => setReflectionNote(e.target.value)} style={{ minHeight: 60 }} />
          <button className="btn btn-primary btn-sm" onClick={handleAddReflection}>Add</button>
        </div>
      </div>
    </div>
  );
}
