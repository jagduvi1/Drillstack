import { useState } from "react";
import useFetch from "../hooks/useFetch";
import { getTaxonomy, getCategories, createTaxonomy, deleteTaxonomy } from "../api/taxonomy";

export default function TaxonomyPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const { data: categories } = useFetch(() => getCategories());
  const { data: items, refetch } = useFetch(
    () => getTaxonomy({ category: selectedCategory || undefined }),
    [selectedCategory]
  );

  const [newItem, setNewItem] = useState({ category: "", name: "", description: "", sport: "" });
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createTaxonomy({
        ...newItem,
        sport: newItem.sport || null,
      });
      setNewItem({ category: "", name: "", description: "", sport: "" });
      refetch();
    } catch (err) {
      setError(err.response?.data?.error || "Create failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this taxonomy item?")) return;
    await deleteTaxonomy(id);
    refetch();
  };

  // Group items by category
  const grouped = {};
  for (const item of items || []) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Taxonomy Manager</h1>

      {/* Filter */}
      <div className="card mb-1">
        <div className="flex gap-sm" style={{ alignItems: "center" }}>
          <label className="text-sm">Filter by category:</label>
          <select className="form-control" style={{ maxWidth: 250 }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      {/* Add new */}
      <div className="card mb-1">
        <h3 style={{ marginBottom: "0.75rem" }}>Add New Item</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr auto", gap: "0.5rem", alignItems: "end" }}>
            <div className="form-group">
              <label>Category *</label>
              <input className="form-control" required list="categories" placeholder="e.g. equipment" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
              <datalist id="categories">
                {categories?.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input className="form-control" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-control" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sport</label>
              <input className="form-control" placeholder="(all)" value={newItem.sport} onChange={(e) => setNewItem({ ...newItem, sport: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Add</button>
          </div>
        </form>
      </div>

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="card mb-1">
          <h3 style={{ textTransform: "capitalize", marginBottom: "0.5rem" }}>
            {category.replace(/_/g, " ")}
            <span className="text-sm text-muted"> ({catItems.length})</span>
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Description</th><th>Sport</th><th></th></tr></thead>
              <tbody>
                {catItems.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td className="text-sm text-muted">{item.description}</td>
                    <td>{item.sport || <span className="text-muted">All</span>}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
