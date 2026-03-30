import api from "./client";

export const splitSimple = (playerIds, groupCount) =>
  api.post("/ai/split-simple", { playerIds, groupCount });

export const splitSmart = (playerIds, groupCount, criteria) =>
  api.post("/ai/split-smart", { playerIds, groupCount, criteria });
