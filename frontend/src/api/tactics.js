import api from "./client";

export const getTactics = (params) => api.get("/tactics", { params });
export const getTactic = (id) => api.get(`/tactics/${id}`);
export const createTactic = (data) => api.post("/tactics", data);
export const updateTactic = (id, data) => api.put(`/tactics/${id}`, data);
export const deleteTactic = (id) => api.delete(`/tactics/${id}`);
export const cloneTactic = (id) => api.post(`/tactics/${id}/clone`);
export const getTacticVersions = (id) => api.get(`/tactics/${id}/versions`);
