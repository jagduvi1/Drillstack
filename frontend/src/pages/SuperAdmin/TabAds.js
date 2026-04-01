import { useState, useEffect } from "react";
import api from "../../api/client";

const DEFAULT_AD = { text: "", bgColor: "#6366f1", textColor: "#ffffff", position: "side" };

const PRESET_COLORS = [
  { label: "Purple", value: "#6366f1" },
  { label: "Blue", value: "#0ea5e9" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Dark", value: "#1a1a2e" },
  { label: "White", value: "#ffffff" },
];

export default function TabAds() {
  const [ads, setAds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/superadmin/ad-boards")
      .then((res) => setAds(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateAd = (index, field, value) => {
    setAds((prev) => prev.map((ad, i) => i === index ? { ...ad, [field]: value } : ad));
  };

  const addAd = () => setAds((prev) => [...prev, { ...DEFAULT_AD }]);

  const removeAd = (index) => setAds((prev) => prev.filter((_, i) => i !== index));

  const moveAd = (index, dir) => {
    const next = [...ads];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setAds(next);
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.put("/superadmin/ad-boards", { ads });
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="sa-card">Loading...</div>;

  return (
    <div>
      <div className="sa-card">
        <h3 style={{ marginBottom: "0.5rem" }}>3D Pitch Ad Boards</h3>
        <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "1rem" }}>
          Configure the advertisement boards shown around the 3D pitch. Each ad becomes a panel on the sideline or behind the goal.
        </p>

        {ads.length === 0 && (
          <p style={{ color: "#666", fontSize: "0.85rem" }}>No ads configured. Using default DrillStack / Cellarion ads.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {ads.map((ad, i) => (
            <div key={i} className="sa-card" style={{ padding: "0.6rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#888", fontSize: "0.75rem", minWidth: 20 }}>#{i + 1}</span>

              <input
                style={{ flex: 1, minWidth: 120, background: "#1a1a2e", border: "1px solid #333", color: "#eee", borderRadius: 4, padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                placeholder="Ad text (e.g. Cellarion.app)"
                value={ad.text}
                onChange={(e) => updateAd(i, "text", e.target.value)}
                maxLength={50}
              />

              <select
                style={{ background: "#1a1a2e", border: "1px solid #333", color: "#eee", borderRadius: 4, padding: "0.35rem", fontSize: "0.8rem" }}
                value={ad.position}
                onChange={(e) => updateAd(i, "position", e.target.value)}
              >
                <option value="side">Sideline</option>
                <option value="goal">Behind goal</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.7rem", color: "#888" }}>BG</label>
                <input type="color" value={ad.bgColor} onChange={(e) => updateAd(i, "bgColor", e.target.value)}
                  style={{ width: 28, height: 28, border: "none", cursor: "pointer" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.7rem", color: "#888" }}>Text</label>
                <input type="color" value={ad.textColor} onChange={(e) => updateAd(i, "textColor", e.target.value)}
                  style={{ width: 28, height: 28, border: "none", cursor: "pointer" }} />
              </div>

              {/* Preview */}
              <div style={{
                background: ad.bgColor, color: ad.textColor, padding: "0.2rem 0.6rem",
                borderRadius: 3, fontSize: "0.7rem", fontWeight: 700, minWidth: 80, textAlign: "center",
              }}>
                {ad.text || "Preview"}
              </div>

              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button className="sa-btn" onClick={() => moveAd(i, -1)} disabled={i === 0}>↑</button>
                <button className="sa-btn" onClick={() => moveAd(i, 1)} disabled={i === ads.length - 1}>↓</button>
                <button className="sa-btn" style={{ color: "#f87171" }} onClick={() => removeAd(i)}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="sa-btn" onClick={addAd}>+ Add Ad</button>
          <button className="sa-btn active" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Ad Boards"}
          </button>
          {msg && <span style={{ color: msg === "Saved!" ? "#4ade80" : "#f87171", fontSize: "0.8rem" }}>{msg}</span>}
        </div>

        {/* Quick presets */}
        <div style={{ marginTop: "1rem", borderTop: "1px solid #333", paddingTop: "0.75rem" }}>
          <span style={{ color: "#888", fontSize: "0.75rem" }}>Quick color presets: </span>
          {PRESET_COLORS.map((c) => (
            <span key={c.value} style={{
              display: "inline-block", width: 16, height: 16, background: c.value,
              borderRadius: 3, margin: "0 0.15rem", border: "1px solid #555", cursor: "help",
            }} title={`${c.label}: ${c.value}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
