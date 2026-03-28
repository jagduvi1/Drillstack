import {
  FiZap,
  FiGrid,
  FiPlay,
  FiCoffee,
  FiFileText,
} from "react-icons/fi";

export const BLOCK_TYPES = ["drills", "stations", "matchplay", "break", "custom"];

export const BLOCK_ICONS = {
  drills: <FiZap />,
  stations: <FiGrid />,
  matchplay: <FiPlay />,
  break: <FiCoffee />,
  custom: <FiFileText />,
};

export const BLOCK_COLORS = {
  drills: "var(--color-primary)",
  stations: "var(--color-warning)",
  matchplay: "var(--color-success)",
  break: "var(--color-muted)",
  custom: "#8b5cf6",
};

export function blockDuration(block) {
  switch (block.type) {
    case "drills":
      return (block.drills || []).reduce((s, d) => s + (d.duration || 0), 0);
    case "stations":
      return (block.stationCount || 0) * (block.rotationMinutes || 0);
    default:
      return block.duration || 0;
  }
}

export const BLOCK_DEFAULTS = {
  drills: { label: "Drill Sequence", drills: [], notes: "" },
  stations: {
    label: "Station Rotation",
    stationCount: 4,
    rotationMinutes: 5,
    stations: [
      { stationNumber: 1, drill: null, notes: "" },
      { stationNumber: 2, drill: null, notes: "" },
      { stationNumber: 3, drill: null, notes: "" },
      { stationNumber: 4, drill: null, notes: "" },
    ],
    notes: "",
  },
  matchplay: { label: "Match Play", duration: 15, matchDescription: "", rules: "", notes: "" },
  break: { label: "Break", duration: 3, notes: "" },
  custom: { label: "Custom", duration: 5, customContent: "", notes: "" },
};

export const BLOCK_LABELS = {
  drills: "Drill Sequence",
  stations: "Station Rotation",
  matchplay: "Match Play",
  break: "Break",
  custom: "Custom",
};

/**
 * Returns localized block labels using the i18n `t` function.
 */
export function getLocalizedBlockLabels(t) {
  return {
    drills: t("blocks.drillSequence"),
    stations: t("blocks.stationRotation"),
    matchplay: t("blocks.matchPlay"),
    break: t("blocks.break"),
    custom: t("blocks.custom"),
  };
}
