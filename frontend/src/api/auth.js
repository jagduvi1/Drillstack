import api from "./client";

export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getMe = () => api.get("/auth/me");
export const refresh = (refreshToken) => api.post("/auth/refresh", { refreshToken });
export const logout = (refreshToken) => api.post("/auth/logout", { refreshToken });
