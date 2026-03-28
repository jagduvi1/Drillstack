import api from "./client";

export const getGroups = () => api.get("/groups");
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post("/groups", data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

export const createTeam = (clubId, data) => api.post(`/groups/${clubId}/teams`, data);
export const getTeams = (clubId) => api.get(`/groups/${clubId}/teams`);

export const addMember = (id, data) => api.post(`/groups/${id}/members`, data);
export const updateMemberRole = (id, userId, data) => api.put(`/groups/${id}/members/${userId}`, data);
export const removeMember = (id, userId) => api.delete(`/groups/${id}/members/${userId}`);

export const inviteTeam = (clubId, inviteCode) => api.post(`/groups/${clubId}/invite-team`, { inviteCode });
export const leaveClub = (teamId) => api.post(`/groups/${teamId}/leave-club`);

export const joinByInvite = (code) => api.post(`/groups/join/${code}`);
export const regenerateInvite = (id) => api.post(`/groups/${id}/regenerate-invite`);
