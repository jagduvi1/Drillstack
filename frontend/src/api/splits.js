import api from "./client";

export const splitSimple = (playerIds, groupCount, guestPlayers = []) =>
  api.post("/ai/split-simple", { playerIds, groupCount, guestPlayers });

export const splitSmart = (playerIds, groupCount, criteria, guestPlayers = []) =>
  api.post("/ai/split-smart", { playerIds, groupCount, criteria, guestPlayers });
