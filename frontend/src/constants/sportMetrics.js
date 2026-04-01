// Default performance metrics per sport.
// Coaches can add custom metrics beyond these defaults.

export const SPORT_METRICS = {
  football: ["speed", "stamina", "technique", "tactical", "passing", "shooting", "heading", "defending"],
  futsal: ["speed", "technique", "passing", "shooting", "defending", "tactical"],
  handball: ["speed", "stamina", "throwing", "technique", "defending", "tactical"],
  hockey: ["skating", "stickHandling", "shooting", "passing", "defending", "tactical"],
  basketball: ["speed", "ballHandling", "shooting", "rebounding", "defending", "tactical"],
  floorball: ["speed", "stickHandling", "shooting", "passing", "defending", "tactical"],
  volleyball: ["serving", "passing", "setting", "attacking", "blocking", "digging"],
  padel: ["serving", "forehand", "backhand", "volley", "lob", "tactical", "footwork"],
  gymnastics: ["flexibility", "strength", "balance", "coordination", "expression"],
};

// Fallback for sports not in the list
export const DEFAULT_METRICS = ["speed", "stamina", "technique", "tactical"];

export function getMetricsForSport(sport) {
  if (!sport) return DEFAULT_METRICS;
  // Match base sport (e.g., "football-7" -> "football")
  const base = sport.split("-")[0];
  return SPORT_METRICS[base] || SPORT_METRICS[sport] || DEFAULT_METRICS;
}
