import api from "./client";

export const generateDrill = (description, sport) =>
  api.post("/ai/generate", { description, sport });

export const generateAndSaveDrill = (description, sport) =>
  api.post("/ai/generate-and-save", { description, sport });

export const refineDrill = (id, message) =>
  api.post(`/ai/refine/${id}`, { message });

export const refineDraft = (drill, message, conversationHistory) =>
  api.post("/ai/refine-draft", { drill, message, conversationHistory });

export const suggestSession = (data) =>
  api.post("/ai/suggest-session", data);

export const summarizeDrill = (drill) =>
  api.post("/ai/summarize", { drill });

export const generateProgram = (data) =>
  api.post("/ai/generate-program", data);

export const generateAndSaveProgram = (data) =>
  api.post("/ai/generate-and-save-program", data);

export const refineProgram = (id, message) =>
  api.post(`/ai/refine-program/${id}`, { message });

export const adaptSession = (session, constraints) =>
  api.post("/ai/adapt-session", { session, constraints });

export const generateDiagram = (drillId) =>
  api.post(`/ai/generate-diagram/${drillId}`);

export const refineSession = (id, message) =>
  api.post(`/ai/refine-session/${id}`, { message });

export const checkSessionFeasibility = (id, actualPlayers, actualTrainers) =>
  api.post(`/ai/check-session-feasibility/${id}`, { actualPlayers, actualTrainers });
