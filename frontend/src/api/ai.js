import api from "./client";

export const suggestTags = (text) => api.post("/ai/suggest-tags", { text });
export const suggestGuidedQuestions = (text) => api.post("/ai/guided-questions", { text });
export const suggestMistakes = (text) => api.post("/ai/common-mistakes", { text });
export const suggestVariations = (text) => api.post("/ai/variations", { text });
export const summarizeDrill = (drill) => api.post("/ai/summarize", { drill });
