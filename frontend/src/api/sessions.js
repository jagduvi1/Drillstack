import api from "./client";

export const getSessions = (params) => api.get("/sessions", { params });
export const getTodaySessions = () => api.get("/sessions/today");
export const getSession = (id) => api.get(`/sessions/${id}`);
export const createSession = (data) => api.post("/sessions", data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const deleteSession = (id) => api.delete(`/sessions/${id}`);
export const updateAttendance = (id, data) =>
  api.put(`/sessions/${id}/attendance`, data);
