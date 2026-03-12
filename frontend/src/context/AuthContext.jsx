import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import api from "../lib/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data, status } = await api.get("/api/auth/me");
      setUser(data.user);
      if (status === 206) {
        return data.user;
      }
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const login = async (credentials) => {
    const { data } = await api.post("/api/auth/login", credentials);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/api/auth/register", payload);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const updateNetBalance = async (netBalance, cashBalance, savingsBalance) => {
    await api.patch('/api/auth/net-balance', { netBalance, cashBalance, savingsBalance });
    await refreshSession();
  }

  useEffect(() => {
    refreshSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      login,
      register,
      logout,
      refreshSession,
      updateNetBalance,
      setUser,
    }),
    [user, isAuthLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
