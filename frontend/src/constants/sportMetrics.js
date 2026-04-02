// Sport-specific performance metrics with types.
// type: "rating" (0-100 slider), "level" (enum), "cert" (boolean certification)

const LEVELS = ["beginner", "intermediate", "advanced", "competitive", "elite"];

// ── Per-sport metric definitions ──────────────────────────────────────────
export const SPORT_METRICS = {
  football: [
    { key: "speed", type: "rating" },
    { key: "stamina", type: "rating" },
    { key: "technique", type: "rating" },
    { key: "tactical", type: "rating" },
    { key: "passing", type: "rating" },
    { key: "shooting", type: "rating" },
    { key: "heading", type: "rating" },
    { key: "defending", type: "rating" },
  ],
  futsal: [
    { key: "speed", type: "rating" },
    { key: "technique", type: "rating" },
    { key: "passing", type: "rating" },
    { key: "shooting", type: "rating" },
    { key: "defending", type: "rating" },
    { key: "tactical", type: "rating" },
  ],
  handball: [
    { key: "speed", type: "rating" },
    { key: "stamina", type: "rating" },
    { key: "throwing", type: "rating" },
    { key: "technique", type: "rating" },
    { key: "defending", type: "rating" },
    { key: "tactical", type: "rating" },
  ],
  hockey: [
    { key: "skating", type: "rating" },
    { key: "stickHandling", type: "rating" },
    { key: "shooting", type: "rating" },
    { key: "passing", type: "rating" },
    { key: "defending", type: "rating" },
    { key: "tactical", type: "rating" },
  ],
  basketball: [
    { key: "speed", type: "rating" },
    { key: "ballHandling", type: "rating" },
    { key: "shooting", type: "rating" },
    { key: "rebounding", type: "rating" },
    { key: "defending", type: "rating" },
    { key: "tactical", type: "rating" },
  ],
  floorball: [
    { key: "speed", type: "rating" },
    { key: "stickHandling", type: "rating" },
    { key: "shooting", type: "rating" },
    { key: "passing", type: "rating" },
    { key: "defending", type: "rating" },
    { key: "tactical", type: "rating" },
  ],
  volleyball: [
    { key: "serving", type: "rating" },
    { key: "passing", type: "rating" },
    { key: "setting", type: "rating" },
    { key: "attacking", type: "rating" },
    { key: "blocking", type: "rating" },
    { key: "digging", type: "rating" },
  ],
  padel: [
    // General attributes
    { key: "defence", type: "rating" },
    { key: "offence", type: "rating" },
    { key: "transition", type: "rating" },
    { key: "mental", type: "rating" },
    { key: "splitStep", type: "rating" },
    // Strokes
    { key: "serving", type: "rating" },
    { key: "returning", type: "rating" },
    { key: "forehand", type: "rating" },
    { key: "backhand", type: "rating" },
    { key: "forehandVolley", type: "rating" },
    { key: "backhandVolley", type: "rating" },
    { key: "blockVolley", type: "rating" },
    { key: "lowVolley", type: "rating" },
    { key: "dropshot", type: "rating" },
    { key: "lob", type: "rating" },
    { key: "chiquita", type: "rating" },
    { key: "vibora", type: "rating" },
    { key: "bandeja", type: "rating" },
    { key: "bajada", type: "rating" },
    { key: "gancho", type: "rating" },
    { key: "rulo", type: "rating" },
    { key: "smash", type: "rating" },
  ],
  tennis: [
    // General attributes
    { key: "defence", type: "rating" },
    { key: "offence", type: "rating" },
    { key: "transition", type: "rating" },
    { key: "mental", type: "rating" },
    { key: "splitStep", type: "rating" },
    // Strokes
    { key: "serving", type: "rating" },
    { key: "returning", type: "rating" },
    { key: "forehand", type: "rating" },
    { key: "backhand", type: "rating" },
    { key: "forehandVolley", type: "rating" },
    { key: "backhandVolley", type: "rating" },
    { key: "dropshot", type: "rating" },
    { key: "lob", type: "rating" },
    { key: "smash", type: "rating" },
    { key: "slice", type: "rating" },
  ],
  gymnastics: [
    // Levels & certifications
    { key: "gymnasticsLevel", type: "level" },
    { key: "certBackflip", type: "cert" },
    { key: "certFrontflip", type: "cert" },
    { key: "certAerial", type: "cert" },
    { key: "certVault", type: "cert" },
    { key: "certBars", type: "cert" },
    { key: "certBeam", type: "cert" },
    { key: "certTrampoline", type: "cert" },
    // Skill ratings
    { key: "flexibility", type: "rating" },
    { key: "strength", type: "rating" },
    { key: "balance", type: "rating" },
    { key: "coordination", type: "rating" },
    { key: "expression", type: "rating" },
    { key: "floorExercise", type: "rating" },
    { key: "vaultSkill", type: "rating" },
    { key: "barsSkill", type: "rating" },
    { key: "beamSkill", type: "rating" },
  ],
};

export const SKILL_LEVELS = LEVELS;

// Sports where a jersey number makes sense
export const SPORTS_WITH_NUMBERS = ["football", "futsal", "handball", "hockey", "basketball", "floorball", "volleyball"];

// Preferred foot vs preferred hand by sport
export const SPORTS_WITH_FOOT = ["football", "futsal"];
export const SPORTS_WITH_HAND = ["handball", "tennis", "padel", "basketball", "volleyball", "floorball", "hockey"];

// Sport-specific position lists
// Most sports: flat array of strings
// Handball: { offence: [...], defence: [...] } — players can hold both
export const SPORT_POSITIONS = {
  football:   ["Goalkeeper", "Right Back", "Centre Back", "Left Back", "Defensive Midfielder", "Central Midfielder", "Attacking Midfielder", "Right Winger", "Left Winger", "Striker"],
  futsal:     ["Goalkeeper", "Fixo", "Ala", "Pivô"],
  handball:   {
    offence: ["Goalkeeper", "Left Back", "Center Back", "Right Back", "Left Wing", "Right Wing", "Pivot"],
    defence: [
      "Goalkeeper",
      // 6-0 defence
      "Left Wing Defender", "Left Back Defender", "Center Left Defender",
      "Center Right Defender", "Right Back Defender", "Right Wing Defender",
      // 5-1 / 3-2-1 roles
      "Front Defender", "Left Half Defender", "Right Half Defender",
    ],
  },
  hockey:     ["Goalkeeper", "Defenceman", "Centre", "Left Wing", "Right Wing"],
  basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  floorball:  ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  volleyball: ["Setter", "Libero", "Outside Hitter", "Opposite Hitter", "Middle Blocker", "Defensive Specialist"],
  padel:      ["Right Side (Forehand)", "Left Side (Backhand)"],
  tennis:     [],
  gymnastics: [],
};

// Returns true if the sport uses dual positions (offence + defence)
export function hasDualPositions(sport) {
  if (!sport) return false;
  const base = sport.split("-")[0];
  const cfg = SPORT_POSITIONS[base] || SPORT_POSITIONS[sport];
  return cfg && !Array.isArray(cfg);
}

// Returns a flat array of positions (for single-position sports) or empty if dual
export function getPositionsForSport(sport) {
  if (!sport) return [];
  const base = sport.split("-")[0];
  const cfg = SPORT_POSITIONS[base] || SPORT_POSITIONS[sport];
  if (!cfg) return [];
  return Array.isArray(cfg) ? cfg : [];
}

// Returns { offence: [...], defence: [...] } for dual-position sports
export function getDualPositions(sport) {
  if (!sport) return null;
  const base = sport.split("-")[0];
  const cfg = SPORT_POSITIONS[base] || SPORT_POSITIONS[sport];
  if (!cfg || Array.isArray(cfg)) return null;
  return cfg;
}

const DEFAULT_METRICS = [
  { key: "speed", type: "rating" },
  { key: "stamina", type: "rating" },
  { key: "technique", type: "rating" },
  { key: "tactical", type: "rating" },
];

export function getMetricsForSport(sport) {
  if (!sport) return DEFAULT_METRICS;
  const base = sport.split("-")[0];
  return SPORT_METRICS[base] || SPORT_METRICS[sport] || DEFAULT_METRICS;
}

/** Returns the effective metric definitions for a group — custom if configured, else sport defaults. */
export function getEffectiveMetrics(group) {
  if (group?.customSkills?.length > 0) {
    return group.customSkills
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((s) => ({ key: s.key, name: s.name, type: s.type || "rating" }));
  }
  return getMetricsForSport(group?.sport);
}
