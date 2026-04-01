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
  // ── Padel ───────────────────────────────────────────────────────────────
  padel: {
    label: "Padel",
    width: 20, height: 10,
    defaultHomePlayers: 2, defaultAwayPlayers: 2,
    bgColor: "#0a2a4a", fieldColor1: "#1a6a9a", fieldColor2: "#1872a4",
    lineColor: "rgba(255,255,255,0.85)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 20, h: 10 },
      halfLong:  { x: 10, y: 0, w: 10, h: 10 },
      halfSide:  { x: 0, y: 0, w: 20, h: 5 },
      blank: { x: 0, y: 0, w: 15, h: 15 },
    },
  },
  // ── Tennis ──────────────────────────────────────────────────────────────
  tennis: {
    label: "Tennis",
    width: 23.77, height: 10.97,
    defaultHomePlayers: 1, defaultAwayPlayers: 1,
    bgColor: "#1a4a2a", fieldColor1: "#2a7a4a", fieldColor2: "#267542",
    lineColor: "rgba(255,255,255,0.9)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 23.77, h: 10.97 },
      halfLong:  { x: 11.885, y: 0, w: 11.885, h: 10.97 },
      halfSide:  { x: 0, y: 0, w: 23.77, h: 5.485 },
      blank: { x: 0, y: 0, w: 15, h: 15 },
    },
  },
  "tennis-doubles": {
    label: "Tennis Doubles",
    renderer: "tennis",
    width: 23.77, height: 10.97,
    defaultHomePlayers: 2, defaultAwayPlayers: 2,
    bgColor: "#1a4a2a", fieldColor1: "#2a7a4a", fieldColor2: "#267542",
    lineColor: "rgba(255,255,255,0.9)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 23.77, h: 10.97 },
      halfLong:  { x: 11.885, y: 0, w: 11.885, h: 10.97 },
      halfSide:  { x: 0, y: 0, w: 23.77, h: 5.485 },
      blank: { x: 0, y: 0, w: 15, h: 15 },
    },
  },
  // ── Gymnastics ───────────────────────────────────────────────────────────
  gymnastics: {
    label: "Gymnastics",
    width: 30, height: 20,
    defaultHomePlayers: 1, defaultAwayPlayers: 0,
    bgColor: "#2a1a3a", fieldColor1: "#5a4a6a", fieldColor2: "#5a4a6a",
    lineColor: "rgba(255,255,255,0.4)",
    fieldViews: {
      full:  { x: 0, y: 0, w: 30, h: 20 },
      blank: { x: 0, y: 0, w: 30, h: 20 },
    },
  },
};

// ── Sport groups for two-level selector ────────────────────────────────────
// First level: sport category. Second level: variants.
export const SPORT_GROUPS = [
  { key: "football", label: "Football", variants: [
    { key: "football", label: "11v11" },
    { key: "football-9", label: "9v9" },
    { key: "football-7", label: "7v7" },
    { key: "football-5", label: "5v5" },
    { key: "football-3", label: "3v3" },
  ]},
  { key: "futsal", label: "Futsal", variants: [] },
  { key: "handball", label: "Handball", variants: [] },
  { key: "basketball", label: "Basketball", variants: [] },
  { key: "hockey", label: "Ice Hockey", variants: [] },
  { key: "floorball", label: "Floorball", variants: [] },
  { key: "volleyball", label: "Volleyball", variants: [] },
  { key: "padel", label: "Padel", variants: [] },
  { key: "tennis", label: "Tennis", variants: [
    { key: "tennis", label: "Singles" },
    { key: "tennis-doubles", label: "Doubles" },
  ]},
  { key: "gymnastics", label: "Gymnastics", variants: [] },
];

// Get the sport group for a given sport key
export function getSportGroup(sportKey) {
  return SPORT_GROUPS.find((g) => g.key === sportKey || g.variants.some((v) => v.key === sportKey));
}

// Helper to get pitch dimensions for a sport
export function getPitch(sport = "football") {
  const cfg = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;
  return { width: cfg.width, height: cfg.height };
}

// ── Drawing tool → arrow style mapping ──────────────────────────────────────
export const DRAW_TOOLS = ["arrow", "pass", "dribble", "dashedArrow", "ballPass"];


// Formations are in formations.js — re-export for backwards compatibility
export { FORMATIONS, SPORT_FORMATIONS, getFormations, getDefaultFormation, buildFormationPieces, createInitialStep } from "./formations";
