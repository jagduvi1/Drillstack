import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
