import { useState } from "react";
import { Link } from "react-router-dom";
import * as searchApi from "../api/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [sport, setSport] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const params = { q: query, sport: sport || undefined, limit: 30 };
      let res;
      switch (mode) {
        case "semantic":
          res = await searchApi.semanticSearch(params);
          break;
        case "keyword":
          res = await searchApi.keywordSearch(params);
          break;
        default:
          res = await searchApi.hybridSearch(params);
      }
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const linkFor = (r) => {
    switch (r.type) {
      case "drill": return `/drills/${r.id}`;
      case "session": return `/sessions/${r.id}`;
      case "plan": return `/plans/${r.id}`;
      default: return "#";
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Search</h1>

      <form onSubmit={handleSearch}>
        <div className="card mb-1">
          <div className="search-bar">
            <input
              className="form-control"
              placeholder="Search drills, sessions, plans..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="form-control" style={{ width: 150 }} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="hybrid">Hybrid</option>
              <option value="semantic">Semantic</option>
              <option value="keyword">Keyword</option>
            </select>
            <input className="form-control" style={{ width: 140 }} placeholder="Sport filter" value={sport} onChange={(e) => setSport(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "..." : "Search"}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      {results.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Score</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td><Link to={linkFor(r)}>{r.title || r.id}</Link></td>
                    <td><span className="tag">{r.type}</span></td>
                    <td className="text-sm">{(r.score * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <p className="text-muted">No results found. Try a different query or search mode.</p>
      )}
    </div>
  );
}
