import api from "./client";

export const getPlans = (params) => api.get("/plans", { params });
export const getPlan = (id) => api.get(`/plans/${id}`);
export const createPlan = (data) => api.post("/plans", data);
export const updatePlan = (id, data) => api.put(`/plans/${id}`, data);
export const deletePlan = (id) => api.delete(`/plans/${id}`);
export const addFollower = (planId, groupId) => api.post(`/plans/${planId}/followers`, { groupId });
export const removeFollower = (planId, groupId) => api.delete(`/plans/${planId}/followers/${groupId}`);
