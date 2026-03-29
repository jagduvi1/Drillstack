import api from "./client";

export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getMe = () => api.get("/auth/me");
export const refresh = (refreshToken) => api.post("/auth/refresh", { refreshToken });
export const logout = (refreshToken) => api.post("/auth/logout", { refreshToken });
export const verifyEmail = (token) => api.post("/auth/verify-email", { token });
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (token, password) => api.post("/auth/reset-password", { token, password });
export const resendVerification = () => api.post("/auth/resend-verification");
