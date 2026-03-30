import api from "./client";

export const getContributions = (drillId) => api.get(`/contributions/${drillId}`);
export const addVideo = (drillId, data) => api.post(`/contributions/${drillId}/video`, data);
export const addDrawing = (drillId, formData) =>
  api.post(`/contributions/${drillId}/drawing`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const addTacticContribution = (drillId, data) => api.post(`/contributions/${drillId}/tactic`, data);
export const deleteContribution = (id) => api.delete(`/contributions/${id}`);
