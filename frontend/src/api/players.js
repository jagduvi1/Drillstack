import api from "./client";

export const getPlayers = (groupId, params) => api.get(`/players/${groupId}`, { params });
export const addPlayer = (groupId, data) => api.post(`/players/${groupId}`, data);
export const updatePlayer = (groupId, playerId, data) => api.put(`/players/${groupId}/${playerId}`, data);
export const deletePlayer = (groupId, playerId) => api.delete(`/players/${groupId}/${playerId}`);
