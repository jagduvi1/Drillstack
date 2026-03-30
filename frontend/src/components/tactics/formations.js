import { SPORT_CONFIGS, getPitch } from "./sportConfigs";

// ── Formation presets per sport ─────────────────────────────────────────────
export const FORMATIONS = {
  // Football (11v11) — 105×68
  "4-4-2": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "RM", x: 40, y: 10 },
    { role: "CM", x: 38, y: 28 }, { role: "CM", x: 38, y: 40 }, { role: "LM", x: 40, y: 58 },
    { role: "ST", x: 52, y: 28 }, { role: "ST", x: 52, y: 40 },
  ],
  "4-3-3": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "CDM", x: 35, y: 34 },
    { role: "CM", x: 42, y: 20 }, { role: "CM", x: 42, y: 48 }, { role: "RW", x: 55, y: 10 },
    { role: "ST", x: 55, y: 34 }, { role: "LW", x: 55, y: 58 },
  ],
  "3-5-2": [
    { role: "GK", x: 5, y: 34 }, { role: "CB", x: 18, y: 17 }, { role: "CB", x: 16, y: 34 },
    { role: "CB", x: 18, y: 51 }, { role: "RWB", x: 36, y: 5 }, { role: "CM", x: 34, y: 22 },
    { role: "CDM", x: 30, y: 34 }, { role: "CM", x: 34, y: 46 }, { role: "LWB", x: 36, y: 63 },
    { role: "ST", x: 52, y: 26 }, { role: "ST", x: 52, y: 42 },
  ],
  "4-2-3-1": [
    { role: "GK", x: 5, y: 34 }, { role: "RB", x: 21, y: 8 }, { role: "CB", x: 19, y: 25 },
    { role: "CB", x: 19, y: 43 }, { role: "LB", x: 21, y: 60 }, { role: "CDM", x: 33, y: 26 },
    { role: "CDM", x: 33, y: 42 }, { role: "RW", x: 48, y: 12 }, { role: "CAM", x: 46, y: 34 },
    { role: "LW", x: 48, y: 56 }, { role: "ST", x: 55, y: 34 },
  ],
  "3-4-3": [
    { role: "GK", x: 5, y: 34 }, { role: "CB", x: 18, y: 17 }, { role: "CB", x: 16, y: 34 },
    { role: "CB", x: 18, y: 51 }, { role: "RM", x: 38, y: 8 }, { role: "CM", x: 35, y: 26 },
    { role: "CM", x: 35, y: 42 }, { role: "LM", x: 38, y: 60 }, { role: "RW", x: 55, y: 12 },
    { role: "ST", x: 55, y: 34 }, { role: "LW", x: 55, y: 56 },
  ],
  "5-3-2": [
    { role: "GK", x: 5, y: 34 }, { role: "RWB", x: 24, y: 5 }, { role: "CB", x: 17, y: 20 },
    { role: "CB", x: 15, y: 34 }, { role: "CB", x: 17, y: 48 }, { role: "LWB", x: 24, y: 63 },
    { role: "CM", x: 38, y: 20 }, { role: "CM", x: 36, y: 34 }, { role: "CM", x: 38, y: 48 },
    { role: "ST", x: 52, y: 26 }, { role: "ST", x: 52, y: 42 },
  ],
};

// Sport-specific formations
export const SPORT_FORMATIONS = {
  football: FORMATIONS,
  // Football 9v9 — 75×55
  "football-9": {
    "3-3-2": [
      { role: "GK", x: 3, y: 27.5 }, { role: "RB", x: 16, y: 10 }, { role: "CB", x: 14, y: 27.5 },
      { role: "LB", x: 16, y: 45 }, { role: "RM", x: 28, y: 10 }, { role: "CM", x: 26, y: 27.5 },
      { role: "LM", x: 28, y: 45 }, { role: "ST", x: 36, y: 20 }, { role: "ST", x: 36, y: 35 },
    ],
    "3-2-3": [
      { role: "GK", x: 3, y: 27.5 }, { role: "RB", x: 14, y: 10 }, { role: "CB", x: 12, y: 27.5 },
      { role: "LB", x: 14, y: 45 }, { role: "CM", x: 24, y: 20 }, { role: "CM", x: 24, y: 35 },
      { role: "RW", x: 36, y: 8 }, { role: "ST", x: 36, y: 27.5 }, { role: "LW", x: 36, y: 47 },
    ],
    "2-4-2": [
      { role: "GK", x: 3, y: 27.5 }, { role: "CB", x: 12, y: 20 }, { role: "CB", x: 12, y: 35 },
      { role: "RM", x: 24, y: 8 }, { role: "CM", x: 22, y: 20 }, { role: "CM", x: 22, y: 35 },
      { role: "LM", x: 24, y: 47 }, { role: "ST", x: 36, y: 20 }, { role: "ST", x: 36, y: 35 },
    ],
  },
  // Football 7v7 — 60×40
  "football-7": {
    "2-3-1": [
      { role: "GK", x: 2, y: 20 }, { role: "CB", x: 12, y: 12 }, { role: "CB", x: 12, y: 28 },
      { role: "RM", x: 22, y: 6 }, { role: "CM", x: 20, y: 20 }, { role: "LM", x: 22, y: 34 },
      { role: "ST", x: 30, y: 20 },
    ],
    "3-2-1": [
      { role: "GK", x: 2, y: 20 }, { role: "RB", x: 10, y: 8 }, { role: "CB", x: 8, y: 20 },
      { role: "LB", x: 10, y: 32 }, { role: "CM", x: 20, y: 14 }, { role: "CM", x: 20, y: 26 },
      { role: "ST", x: 30, y: 20 },
    ],
    "2-2-2": [
      { role: "GK", x: 2, y: 20 }, { role: "CB", x: 10, y: 13 }, { role: "CB", x: 10, y: 27 },
      { role: "CM", x: 20, y: 13 }, { role: "CM", x: 20, y: 27 }, { role: "ST", x: 28, y: 13 },
      { role: "ST", x: 28, y: 27 },
    ],
  },
  // Football 5v5 — 40×25
  "football-5": {
    "1-2-1": [
      { role: "GK", x: 1, y: 12.5 }, { role: "D", x: 8, y: 12.5 },
      { role: "M", x: 16, y: 6 }, { role: "M", x: 16, y: 19 },
      { role: "ST", x: 20, y: 12.5 },
    ],
    "2-1-1": [
      { role: "GK", x: 1, y: 12.5 }, { role: "D", x: 8, y: 7 }, { role: "D", x: 8, y: 18 },
      { role: "M", x: 16, y: 12.5 }, { role: "ST", x: 20, y: 12.5 },
    ],
    "2-2": [
      { role: "GK", x: 1, y: 12.5 }, { role: "D", x: 8, y: 7 }, { role: "D", x: 8, y: 18 },
      { role: "F", x: 18, y: 7 }, { role: "F", x: 18, y: 18 },
    ],
  },
  // Football 3v3 — 30×20
  "football-3": {
    "1-1": [
      { role: "GK", x: 1, y: 10 }, { role: "D", x: 8, y: 10 }, { role: "F", x: 14, y: 10 },
    ],
    "2": [
      { role: "GK", x: 1, y: 10 }, { role: "F", x: 12, y: 5 }, { role: "F", x: 12, y: 15 },
    ],
  },
  handball: {
    // 7v7 — 40×20, spread players across the half
    "6-0": [
      { role: "GK", x: 2, y: 10 }, { role: "LW", x: 17, y: 2 }, { role: "LB", x: 14, y: 5 },
      { role: "CB", x: 12, y: 10 }, { role: "RB", x: 14, y: 15 }, { role: "RW", x: 17, y: 18 },
      { role: "P", x: 8, y: 10 },
    ],
    "5-1": [
      { role: "GK", x: 2, y: 10 }, { role: "LW", x: 17, y: 2 }, { role: "LB", x: 13, y: 6 },
      { role: "CB", x: 9, y: 10 }, { role: "RB", x: 13, y: 14 }, { role: "RW", x: 17, y: 18 },
      { role: "P", x: 17, y: 10 },
    ],
    "3-3": [
      { role: "GK", x: 2, y: 10 }, { role: "LW", x: 17, y: 3 }, { role: "C", x: 17, y: 10 },
      { role: "RW", x: 17, y: 17 }, { role: "LB", x: 10, y: 5 }, { role: "CB", x: 8, y: 10 },
      { role: "RB", x: 10, y: 15 },
    ],
  },
  hockey: {
    // 6v6 (5 + goalie) — 60×26
    "1-2-2": [
      { role: "G", x: 3, y: 13 }, { role: "LD", x: 15, y: 8 }, { role: "RD", x: 15, y: 18 },
      { role: "LW", x: 28, y: 5 }, { role: "C", x: 30, y: 13 }, { role: "RW", x: 28, y: 21 },
    ],
    "1-3-1": [
      { role: "G", x: 3, y: 13 }, { role: "D", x: 14, y: 13 }, { role: "LW", x: 26, y: 5 },
      { role: "C", x: 24, y: 13 }, { role: "RW", x: 26, y: 21 }, { role: "F", x: 35, y: 13 },
    ],
    "1-4": [
      { role: "G", x: 3, y: 13 }, { role: "D", x: 15, y: 13 }, { role: "LW", x: 28, y: 4 },
      { role: "LC", x: 28, y: 10 }, { role: "RC", x: 28, y: 16 }, { role: "RW", x: 28, y: 22 },
    ],
  },
  basketball: {
    // 5v5 — 28×15
    "1-2-2": [
      { role: "PG", x: 10, y: 7.5 }, { role: "SG", x: 8, y: 3 }, { role: "SF", x: 8, y: 12 },
      { role: "PF", x: 4, y: 4 }, { role: "C", x: 4, y: 11 },
    ],
    "1-3-1": [
      { role: "PG", x: 10, y: 7.5 }, { role: "SG", x: 7, y: 2.5 }, { role: "C", x: 5, y: 7.5 },
      { role: "SF", x: 7, y: 12.5 }, { role: "PF", x: 2.5, y: 7.5 },
    ],
    "2-3": [
      { role: "PG", x: 10, y: 5 }, { role: "SG", x: 10, y: 10 }, { role: "SF", x: 6, y: 2 },
      { role: "PF", x: 4, y: 7.5 }, { role: "C", x: 6, y: 13 },
    ],
  },
  futsal: {
    // 5v5 — 40×20
    "1-2-1": [
      { role: "GK", x: 1, y: 10 }, { role: "F", x: 12, y: 5 }, { role: "F", x: 12, y: 15 },
      { role: "P", x: 8, y: 10 }, { role: "U", x: 18, y: 10 },
    ],
    "2-2": [
      { role: "GK", x: 1, y: 10 }, { role: "D", x: 8, y: 5 }, { role: "D", x: 8, y: 15 },
      { role: "F", x: 16, y: 5 }, { role: "F", x: 16, y: 15 },
    ],
    "1-1-2": [
      { role: "GK", x: 1, y: 10 }, { role: "D", x: 8, y: 10 }, { role: "P", x: 14, y: 10 },
      { role: "F", x: 18, y: 5 }, { role: "F", x: 18, y: 15 },
    ],
  },
  floorball: {
    // 6v6 (5 + goalie) — 40×20
    "2-1-2": [
      { role: "G", x: 1, y: 10 }, { role: "D", x: 8, y: 5 }, { role: "D", x: 8, y: 15 },
      { role: "C", x: 14, y: 10 }, { role: "F", x: 18, y: 5 }, { role: "F", x: 18, y: 15 },
    ],
    "1-2-2": [
      { role: "G", x: 1, y: 10 }, { role: "D", x: 8, y: 10 }, { role: "M", x: 13, y: 5 },
      { role: "M", x: 13, y: 15 }, { role: "F", x: 18, y: 5 }, { role: "F", x: 18, y: 15 },
    ],
    "2-2-1": [
      { role: "G", x: 1, y: 10 }, { role: "D", x: 7, y: 5 }, { role: "D", x: 7, y: 15 },
      { role: "M", x: 13, y: 5 }, { role: "M", x: 13, y: 15 }, { role: "F", x: 18, y: 10 },
    ],
  },
  gymnastics: {
    "solo": [{ role: "G", x: 15, y: 10 }],
    "with-coach": [{ role: "G", x: 15, y: 10 }, { role: "C", x: 5, y: 16 }],
    "with-spotters": [{ role: "G", x: 15, y: 10 }, { role: "S", x: 12, y: 10 }, { role: "S", x: 18, y: 10 }],
  },
  volleyball: {
    // 6v6 — 18×9
    "rotation-1": [
      { role: "S", x: 2, y: 1.5 }, { role: "OH", x: 2, y: 4.5 }, { role: "MB", x: 2, y: 7.5 },
      { role: "OP", x: 5, y: 1.5 }, { role: "MB", x: 5, y: 4.5 }, { role: "OH", x: 5, y: 7.5 },
    ],
    "rotation-2": [
      { role: "OH", x: 2, y: 1.5 }, { role: "S", x: 2, y: 4.5 }, { role: "OH", x: 2, y: 7.5 },
      { role: "MB", x: 5, y: 1.5 }, { role: "OP", x: 5, y: 4.5 }, { role: "MB", x: 5, y: 7.5 },
    ],
    "rotation-3": [
      { role: "MB", x: 2, y: 1.5 }, { role: "OH", x: 2, y: 4.5 }, { role: "S", x: 2, y: 7.5 },
      { role: "OH", x: 5, y: 1.5 }, { role: "MB", x: 5, y: 4.5 }, { role: "OP", x: 5, y: 7.5 },
    ],
  },
};

// Get formations for a specific sport
export function getFormations(sport = "football") {
  return SPORT_FORMATIONS[sport] || SPORT_FORMATIONS.football;
}

// Get default formation key for a sport
export function getDefaultFormation(sport = "football") {
  const formations = getFormations(sport);
  return Object.keys(formations)[0];
}

export function buildFormationPieces(team, formation, sport = "football") {
  const formations = getFormations(sport);
  const positions = formations[formation] || Object.values(formations)[0];
  const pitch = getPitch(sport);
  const isGymnastics = sport.startsWith("gymnastics");
  const hasGoalkeeper = !isGymnastics && ["football", "handball", "futsal", "hockey", "floorball"].includes(sport);
  return positions.map((pos, i) => ({
    id: `${team}-${i}`,
    type: "player",
    team,
    isGK: hasGoalkeeper && i === 0,
    label: isGymnastics ? pos.role : (hasGoalkeeper && i === 0) ? "GK" : String(i),
    x: team === "away" ? pitch.width - pos.x : pos.x,
    y: pos.y,
  }));
}

export function createInitialStep(homeFormation = "4-4-2", awayFormation = "4-4-2", sport = "football") {
  const pitch = getPitch(sport);
  return {
    id: "step-0",
    label: "Setup",
    duration: 1500,
    pieces: [
      ...buildFormationPieces("home", homeFormation, sport),
      ...buildFormationPieces("away", awayFormation, sport),
      { id: "ball", type: "ball", team: "neutral", label: "", x: pitch.width / 2, y: pitch.height / 2 },
    ],
    arrows: [],
  };
}
