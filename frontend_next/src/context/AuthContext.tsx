"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import apiClient, { setAuthToken, clearAuthToken } from "@/api/client";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "hr" | "interviewer" | "candidate";
  isVerified: boolean;
  isActive: boolean;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearAuthToken();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((token: string) => {
    // Decode JWT to get expiry
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiresAt = payload.exp * 1000;
      const refreshAt = expiresAt - Date.now() - 60_000; // refresh 1 min before expiry

      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

      if (refreshAt > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          try {
            const res = await apiClient.post("/auth/refresh");
            const { user: freshUser, accessToken: freshToken } = res.data;
            setUser(freshUser);
            setAccessToken(freshToken);
            setAuthToken(freshToken);
            scheduleRefresh(freshToken);
          } catch {
            clearSession();
          }
        }, refreshAt);
      }
    } catch {
      // Token decode failed - skip scheduling
    }
  }, [clearSession]);

  const setSession = useCallback((newUser: User, token: string) => {
    setUser(newUser);
    setAccessToken(token);
    setAuthToken(token);
    scheduleRefresh(token);
  }, [scheduleRefresh]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiClient.post("/auth/refresh");
      const { user: freshUser, accessToken: freshToken } = res.data;
      setSession(freshUser, freshToken);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [setSession, clearSession]);

  // On mount: try to restore session from the httpOnly refresh cookie
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.post("/auth/refresh");
        if (!cancelled) {
          setSession(res.data.user, res.data.accessToken);
        }
      } catch {
        // No valid refresh cookie — user must log in
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        setSession,
        clearSession,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
