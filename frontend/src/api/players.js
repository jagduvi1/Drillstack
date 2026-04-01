import api from "./client";

export const getPlayers = (groupId, params) => api.get(`/players/${groupId}`, { params });
export const addPlayer = (groupId, data) => api.post(`/players/${groupId}`, data);
export const updatePlayer = (groupId, playerId, data) => api.put(`/players/${groupId}/${playerId}`, data);
export const deletePlayer = (groupId, playerId) => api.delete(`/players/${groupId}/${playerId}`);

// Player profile
export const getPlayerOverview = (groupId, playerId) => api.get(`/players/${groupId}/${playerId}/overview`);
export const getPlayerMetrics = (groupId, playerId) => api.get(`/players/${groupId}/${playerId}/metrics`);
export const updatePlayerMetrics = (groupId, playerId, data) => api.put(`/players/${groupId}/${playerId}/metrics`, data);
export const getPlayerHistory = (groupId, playerId, params) => api.get(`/players/${groupId}/${playerId}/history`, { params });
export const getPlayerGoals = (groupId, playerId, params) => api.get(`/players/${groupId}/${playerId}/goals`, { params });
export const createPlayerGoal = (groupId, playerId, data) => api.post(`/players/${groupId}/${playerId}/goals`, data);
export const updatePlayerGoal = (groupId, playerId, goalId, data) => api.put(`/players/${groupId}/${playerId}/goals/${goalId}`, data);
export const deletePlayerGoal = (groupId, playerId, goalId) => api.delete(`/players/${groupId}/${playerId}/goals/${goalId}`);
export const getPlayerNotes = (groupId, playerId, params) => api.get(`/players/${groupId}/${playerId}/notes`, { params });
export const createPlayerNote = (groupId, playerId, data) => api.post(`/players/${groupId}/${playerId}/notes`, data);
export const deletePlayerNote = (groupId, playerId, noteId) => api.delete(`/players/${groupId}/${playerId}/notes/${noteId}`);
export const getPlayerAttendance = (groupId, playerId, params) => api.get(`/players/${groupId}/${playerId}/attendance`, { params });
