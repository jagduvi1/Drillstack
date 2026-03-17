import api from "./client";

export const getOverview = () => api.get("/superadmin/overview");
export const getServices = () => api.get("/superadmin/services");
export const getDatabase = () => api.get("/superadmin/database");
export const getAISettings = () => api.get("/superadmin/ai");
export const updateAISetting = (key, value) => api.put(`/superadmin/ai/${key}`, { value });
export const resetAISetting = (key) => api.delete(`/superadmin/ai/${key}`);
export const getUsers = (params) => api.get("/superadmin/users", { params });
export const updateUserPlan = (id, data) => api.put(`/superadmin/users/${id}/plan`, data);
export const getAuditLog = (params) => api.get("/superadmin/audit", { params });
