import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as searchApi from "../api/search";
import { FiSearch } from "react-icons/fi";

export default function SearchPage() {
  const { t } = useTranslation();
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
      setError(err.response?.data?.error || t("search.searchFailed"));
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
      <h1 style={{ marginBottom: "0.5rem" }}>{t("search.title")}</h1>
      <p className="text-muted" style={{ marginBottom: "1rem" }}>
        {t("search.description")}
      </p>

      <form onSubmit={handleSearch}>
        <div className="card mb-1">
          <div className="search-bar">
            <input
              className="form-control"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="form-control" style={{ width: 130 }} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="hybrid">{t("search.hybrid")}</option>
              <option value="semantic">{t("search.semantic")}</option>
              <option value="keyword">{t("search.keyword")}</option>
            </select>
            <input className="form-control" style={{ width: 130 }} placeholder={t("search.sportFilter")} value={sport} onChange={(e) => setSport(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <FiSearch /> {loading ? "..." : t("common.search")}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      {results.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t("search.resultTitle")}</th><th>{t("search.resultType")}</th><th>{t("search.resultMatch")}</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td><Link to={linkFor(r)}>{r.title || r.id}</Link></td>
                    <td><span className="tag">{r.type}</span></td>
                    <td className="text-sm">{(r.score * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <p className="text-muted">{t("search.noResults")}</p>
      )}
    </div>
  );
}
