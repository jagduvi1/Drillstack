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
    { key: "serving", type: "rating" },
    { key: "forehand", type: "rating" },
    { key: "backhand", type: "rating" },
    { key: "volley", type: "rating" },
    { key: "lob", type: "rating" },
    { key: "tactical", type: "rating" },
    { key: "footwork", type: "rating" },
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
