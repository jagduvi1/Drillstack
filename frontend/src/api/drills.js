import api from "./client";

export const getDrills = (params) => api.get("/drills", { params });
export const getDrill = (id) => api.get(`/drills/${id}`);
export const createDrill = (data) => api.post("/drills", data);
export const updateDrill = (id, data) => api.put(`/drills/${id}`, data);
export const deleteDrill = (id) => api.delete(`/drills/${id}`);
export const uploadDiagram = (id, formData) =>
  api.post(`/drills/${id}/diagrams`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const addReflection = (id, note) =>
  api.post(`/drills/${id}/reflections`, { note });
export const getEmbeddingStatus = () => api.get("/drills/embedding-status");
export const retryEmbedding = (id) =>
  api.post(`/drills/${id}/retry-embedding`);
