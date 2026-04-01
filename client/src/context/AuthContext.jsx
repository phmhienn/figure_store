import { createContext, useContext, useEffect, useState } from "react";

import authService from "../services/authService";
import { STORAGE_KEYS } from "../constants/storage";

const AuthContext = createContext(null);

const readStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH) || "null");
  } catch (_error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistAuth = (payload) => {
    const nextState = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };

    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(nextState));
    setAuthState(nextState);
    return nextState;
  };

  const clearAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    setAuthState(null);
  };

  useEffect(() => {
    // Restore the user profile from the API so role-based UI stays in sync.
    const restoreSession = async () => {
      const storedAuth = readStoredAuth();

      if (!storedAuth?.accessToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        persistAuth({
          accessToken: storedAuth.accessToken,
          refreshToken: storedAuth.refreshToken,
          user,
        });
      } catch (_error) {
        clearAuth();
      } finally {
        setIsBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (payload) => {
    const data = await authService.login(payload);
    persistAuth(data);
    return data;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    persistAuth(data);
    return data;
  };

  const logout = async () => {
    const storedAuth = readStoredAuth();
    if (storedAuth?.refreshToken) {
      await authService.logout(storedAuth.refreshToken);
    }
    clearAuth();
  };

  const refreshToken = async () => {
    try {
      const storedAuth = readStoredAuth();
      if (!storedAuth?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const data = await authService.refreshAccessToken(
        storedAuth.refreshToken,
      );
      persistAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || storedAuth.refreshToken,
        user: storedAuth.user,
      });
      return data.accessToken;
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const value = {
    accessToken: authState?.accessToken || null,
    user: authState?.user || null,
    isAuthenticated: Boolean(authState?.accessToken),
    isAdmin: authState?.user?.role === "admin",
    isBootstrapping,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
