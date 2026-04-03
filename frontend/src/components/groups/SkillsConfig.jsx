import { useState, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { updateGroup, getSkillSuggestions } from "../../api/groups";
import { getMetricsForSport } from "../../constants/sportMetrics";
import { FiPlus, FiTrash2, FiSave, FiCheck } from "react-icons/fi";

export default memo(function SkillsConfig({ group, onSaved }) {
  const { t } = useTranslation();
  const sportDefaults = getMetricsForSport(group.sport);

  // Initialize from group's customSkills, or from sport defaults if empty
  const [skills, setSkills] = useState(() => {
    if (group.customSkills?.length > 0) {
      return group.customSkills
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((s) => ({ key: s.key, name: s.name, type: s.type || "rating", weight: s.weight ?? 5 }));
    }
    return sportDefaults.map((d) => ({
      key: d.key,
      name: t(`metrics.${d.key}`, d.key),
      type: d.type,
      weight: 5,
    }));
  });
  const [weightsEnabled, setWeightsEnabled] = useState(!!group.skillWeightsEnabled);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("rating");
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch suggestions from other teams with the same sport
  useEffect(() => {
    if (group.sport) {
      getSkillSuggestions(group.sport)
        .then((res) => setSuggestions(res.data || []))
        .catch(() => {});
    }
  }, [group.sport]);

  // Filter suggestions as user types
  useEffect(() => {
    if (!newName.trim()) { setFilteredSuggestions([]); return; }
    const query = newName.toLowerCase();
    const existingKeys = new Set(skills.map((s) => s.key));

    // Combine suggestions from other teams + sport defaults
    const allSuggestions = new Map();
    for (const s of suggestions) {
      if (!existingKeys.has(s.key)) allSuggestions.set(s.key, { key: s.key, name: s.name, type: s.type });
    }
    for (const d of sportDefaults) {
      if (!existingKeys.has(d.key) && !allSuggestions.has(d.key)) {
        allSuggestions.set(d.key, { key: d.key, name: t(`metrics.${d.key}`, d.key), type: d.type });
      }
    }

    const filtered = [...allSuggestions.values()]
      .filter((s) => s.name.toLowerCase().includes(query) || s.key.includes(query))
      .slice(0, 8);
    setFilteredSuggestions(filtered);
  }, [newName, skills, suggestions, sportDefaults, t]);

  const addSkill = (name, type, key) => {
    const skillKey = key || name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!skillKey || skills.some((s) => s.key === skillKey)) return;
    setSkills([...skills, { key: skillKey, name: name.trim(), type, weight: 5 }]);
    setNewName("");
    setFilteredSuggestions([]);
  };

  const removeSkill = (idx) => {
    setSkills(skills.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const customSkills = skills.map((s, i) => ({ key: s.key, name: s.name, type: s.type, order: i, weight: s.weight ?? 5 }));
      await updateGroup(group._id, { customSkills, skillWeightsEnabled: weightsEnabled });
      onSaved?.({ ...group, customSkills, skillWeightsEnabled: weightsEnabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setSkills(sportDefaults.map((d) => ({
      key: d.key,
      name: t(`metrics.${d.key}`, d.key),
      type: d.type,
      weight: 5,
    })));
    setWeightsEnabled(false);
  };

  return (
    <div className="card mb-1">
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>{t("skills.title")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button type="button" onClick={() => {
              const next = !weightsEnabled;
              setWeightsEnabled(next);
              // Auto-save the toggle
              const customSkills = skills.map((s, i) => ({ key: s.key, name: s.name, type: s.type, order: i, weight: s.weight ?? 5 }));
              updateGroup(group._id, { customSkills, skillWeightsEnabled: next })
                .then(() => onSaved?.({ ...group, customSkills, skillWeightsEnabled: next }))
                .catch(() => {});
            }}
              style={{
                width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative",
                background: weightsEnabled ? "var(--color-primary)" : "#ccc", transition: "background 0.2s",
              }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
                left: weightsEnabled ? 20 : 2, transition: "left 0.2s",
              }} />
            </button>
            <span className="text-xs text-muted">{t("skills.weights")}</span>
          </div>
        </div>
        <span className="text-sm text-muted">{t("skills.count", { count: skills.length })}</span>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>{t("skills.description")}</p>

      {!weightsEnabled ? null : <>
      {/* Skills list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
        {skills.map((skill, idx) => (
          <div key={skill.key} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "var(--color-bg)", borderRadius: "var(--radius)", padding: "0.4rem 0.6rem",
          }}>
            <span style={{ minWidth: 80, fontWeight: 500, fontSize: "0.85rem" }}>{skill.name}</span>
            {weightsEnabled && skill.type === "rating" && (
              <input
                type="range" min={1} max={10} step={1}
                value={skill.weight ?? 5}
                onChange={(e) => {
                  const updated = [...skills];
                  updated[idx] = { ...updated[idx], weight: Number(e.target.value) };
                  setSkills(updated);
                }}
                style={{ flex: 1 }}
                title={t("skills.weight")}
              />
            )}
            {!weightsEnabled && <span style={{ flex: 1 }} />}
            <span className="tag" style={{ fontSize: "0.6rem" }}>{skill.type}</span>
            {weightsEnabled && skill.type === "rating" && (
              <span className="text-xs" style={{ minWidth: 16, textAlign: "center", fontWeight: 600 }}>{skill.weight ?? 5}</span>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => removeSkill(idx)}
              style={{ padding: "0.1rem 0.3rem" }}><FiTrash2 /></button>
          </div>
        ))}
      </div>

      {/* Add skill */}
      <div style={{ position: "relative" }}>
        <div className="flex gap-sm" style={{ marginBottom: "0.25rem" }}>
          <input
            className="form-control form-control-sm"
            placeholder={t("skills.addPlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                addSkill(newName, newType);
              }
            }}
            style={{ flex: 1 }}
          />
          <select className="form-control form-control-sm" value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: 90 }}>
            <option value="rating">{t("skills.typeRating")}</option>
            <option value="level">{t("skills.typeLevel")}</option>
            <option value="cert">{t("skills.typeCert")}</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => newName.trim() && addSkill(newName, newType)}
            disabled={!newName.trim()}><FiPlus /></button>
        </div>

        {/* Autocomplete dropdown */}
        {filteredSuggestions.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 90 + 40, top: "100%", zIndex: 50,
            background: "var(--color-card, white)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxHeight: 200, overflow: "auto",
          }}>
            {filteredSuggestions.map((s) => (
              <button key={s.key} onClick={() => addSkill(s.name, s.type, s.key)} style={{
                display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                padding: "0.4rem 0.6rem", border: "none", background: "none",
                cursor: "pointer", textAlign: "left", fontSize: "0.85rem",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg, #f3f4f6)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                <span style={{ flex: 1 }}>{s.name}</span>
                <span className="tag" style={{ fontSize: "0.6rem" }}>{s.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      </>}

      {/* Actions */}
      <div className="flex gap-sm" style={{ marginTop: "0.75rem", alignItems: "center" }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saved ? <><FiCheck /> {t("settings.saved")}</> : <><FiSave /> {saving ? "..." : t("common.save")}</>}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleReset}>
          {t("skills.resetToDefaults")}
        </button>
      </div>
    </div>
  );
});
