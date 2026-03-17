import api from "./client";

export const getNotifications = () => api.get("/notifications");
export const getUnreadCount = () => api.get("/notifications/unread-count");
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const forkSnapshot = (id) => api.post(`/notifications/${id}/fork-snapshot`);
export const dismissNotification = (id) => api.delete(`/notifications/${id}`);
