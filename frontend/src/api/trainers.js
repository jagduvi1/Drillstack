import api from "./client";

export const getTrainers = (groupId, params) => api.get(`/trainers/${groupId}`, { params });
export const addTrainer = (groupId, data) => api.post(`/trainers/${groupId}`, data);
export const updateTrainer = (groupId, trainerId, data) => api.put(`/trainers/${groupId}/${trainerId}`, data);
export const deleteTrainer = (groupId, trainerId) => api.delete(`/trainers/${groupId}/${trainerId}`);
