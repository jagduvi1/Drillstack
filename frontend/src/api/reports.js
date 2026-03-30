import api from "./client";

export const submitReport = (data) => api.post("/reports", data);
export const getReports = (params) => api.get("/reports", { params });
export const resolveReport = (id, data) => api.put(`/reports/${id}`, data);
