// ── Sport configurations ───────────────────────────────────────────────────
// Football pitch sizes per format (official recommendations)
export const FB_FORMATS = {
  "football":    { label: "Football 11v11", w: 105, h: 68, players: 11 },
  "football-9":  { label: "Football 9v9",   w: 75,  h: 55, players: 9 },
  "football-7":  { label: "Football 7v7",   w: 60,  h: 40, players: 7 },
  "football-5":  { label: "Football 5v5",   w: 40,  h: 25, players: 5 },
  "football-3":  { label: "Football 3v3",   w: 30,  h: 20, players: 3 },
};

export function makeFbConfig(fmt) {
  const f = FB_FORMATS[fmt];
  return {
    label: f.label,
    width: f.w, height: f.h,
    renderer: "football",
    defaultHomePlayers: f.players, defaultAwayPlayers: f.players,
    bgColor: "#1a472a", fieldColor1: "#2d8a4e", fieldColor2: "#339956",
    lineColor: "rgba(255,255,255,0.8)",
    fieldViews: {
      full:  { x: 0, y: 0, w: f.w, h: f.h },
      half:  { x: f.w / 2, y: 0, w: f.w / 2, h: f.h },
      ...(fmt === "football" ? { third: { x: f.w * 2 / 3, y: 0, w: f.w / 3, h: f.h } } : {}),
      blank: { x: 0, y: 0, w: Math.min(f.w, 40), h: Math.min(f.h, 40) },
    },
  };
}

export const SPORT_CONFIGS = {
  ...Object.fromEntries(Object.keys(FB_FORMATS).map((k) => [k, makeFbConfig(k)])),
  handball: {
    label: "Handball",
    width: 40, height: 20,
    defaultHomePlayers: 7, defaultAwayPlayers: 7,
    bgColor: "#1a2a47", fieldColor1: "#2a5a8a", fieldColor2: "#3068a0",
    lineColor: "rgba(255,255,255,0.8)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 40, h: 20 },
      half:  { x: 20, y: 0, w: 20, h: 20 },
      blank: { x: 0, y: 0, w: 25, h: 25 },
    },
  },
  hockey: {
    label: "Ice Hockey",
    width: 60, height: 26,
    defaultHomePlayers: 6, defaultAwayPlayers: 6,
    bgColor: "#1a2a3a", fieldColor1: "#c8dbe8", fieldColor2: "#d4e5f0",
    lineColor: "rgba(0,0,0,0.6)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 60, h: 26 },
      half:  { x: 30, y: 0, w: 30, h: 26 },
      blank: { x: 0, y: 0, w: 30, h: 25 },
    },
  },
  basketball: {
    label: "Basketball",
    width: 28, height: 15,
    defaultHomePlayers: 5, defaultAwayPlayers: 5,
    bgColor: "#3a1a0a", fieldColor1: "#c4813a", fieldColor2: "#d08f48",
    lineColor: "rgba(255,255,255,0.85)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 28, h: 15 },
      half:  { x: 14, y: 0, w: 14, h: 15 },
      blank: { x: 0, y: 0, w: 20, h: 20 },
    },
  },
  futsal: {
    label: "Futsal",
    width: 40, height: 20,
    defaultHomePlayers: 5, defaultAwayPlayers: 5,
    bgColor: "#1a472a", fieldColor1: "#2d8a4e", fieldColor2: "#339956",
    lineColor: "rgba(255,255,255,0.8)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 40, h: 20 },
      half:  { x: 20, y: 0, w: 20, h: 20 },
      blank: { x: 0, y: 0, w: 25, h: 25 },
    },
  },
  floorball: {
    label: "Floorball",
    width: 40, height: 20,
    defaultHomePlayers: 6, defaultAwayPlayers: 6,
    bgColor: "#1a2a1a", fieldColor1: "#4a7a4a", fieldColor2: "#558855",
    lineColor: "rgba(255,255,255,0.8)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 40, h: 20 },
      half:  { x: 20, y: 0, w: 20, h: 20 },
      blank: { x: 0, y: 0, w: 25, h: 25 },
    },
  },
  volleyball: {
    label: "Volleyball",
    width: 18, height: 9,
    defaultHomePlayers: 6, defaultAwayPlayers: 6,
    bgColor: "#1a1a3a", fieldColor1: "#c4813a", fieldColor2: "#3a6aaa",
    lineColor: "rgba(255,255,255,0.85)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 18, h: 9 },
      half:  { x: 9, y: 0, w: 9, h: 9 },
      blank: { x: 0, y: 0, w: 15, h: 15 },
    },
  },
};

// Helper to get pitch dimensions for a sport
export function getPitch(sport = "football") {
  const cfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;
  return { width: cfg.width, height: cfg.height };
}

// ── Drawing tool → arrow style mapping ──────────────────────────────────────
export const DRAW_TOOLS = ["arrow", "pass", "dribble", "dashedArrow", "ballPass"];

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
    // 7v7 — 40×20
    "6-0": [
      { role: "GK", x: 1, y: 10 }, { role: "LW", x: 16, y: 1 }, { role: "LB", x: 14, y: 5 },
      { role: "CB", x: 12, y: 10 }, { role: "RB", x: 14, y: 15 }, { role: "RW", x: 16, y: 19 },
      { role: "P", x: 10, y: 10 },
    ],
    "5-1": [
      { role: "GK", x: 1, y: 10 }, { role: "LW", x: 16, y: 1 }, { role: "LB", x: 12, y: 5 },
      { role: "CB", x: 10, y: 10 }, { role: "RB", x: 12, y: 15 }, { role: "RW", x: 16, y: 19 },
      { role: "P", x: 16, y: 10 },
    ],
    "3-3": [
      { role: "GK", x: 1, y: 10 }, { role: "LW", x: 16, y: 2 }, { role: "C", x: 16, y: 10 },
      { role: "RW", x: 16, y: 18 }, { role: "LB", x: 10, y: 5 }, { role: "CB", x: 8, y: 10 },
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
  const hasGoalkeeper = ["football", "handball", "futsal", "hockey", "floorball"].includes(sport);
  return positions.map((pos, i) => ({
    id: `${team}-${i}`,
    type: "player",
    team,
    isGK: hasGoalkeeper && i === 0,
    label: (hasGoalkeeper && i === 0) ? "GK" : String(i),
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
