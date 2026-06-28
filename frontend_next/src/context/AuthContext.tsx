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
    if (typeof window !== "undefined") {
      localStorage.removeItem("ims_user");
      localStorage.removeItem("ims_token");
    }
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
            if (typeof window !== "undefined") {
              localStorage.setItem("ims_user", JSON.stringify(freshUser));
              localStorage.setItem("ims_token", freshToken);
            }
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
    if (typeof window !== "undefined") {
      localStorage.setItem("ims_user", JSON.stringify(newUser));
      localStorage.setItem("ims_token", token);
    }
    scheduleRefresh(token);
  }, [scheduleRefresh]);

  const isTokenExpired = (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length < 3) return false; // Standalone mock token: never expires
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return false; // Safe fallback for malformed tokens during standalone mock testing
    }
  };

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiClient.post("/auth/refresh");
      const { user: freshUser, accessToken: freshToken } = res.data;
      setSession(freshUser, freshToken);
      return true;
    } catch {
      if (typeof window !== "undefined") {
        const localToken = localStorage.getItem("ims_token");
        if (!localToken || isTokenExpired(localToken)) {
          clearSession();
          return false;
        }
      }
      return true;
    }
  }, [setSession, clearSession]);

  // On mount: try to restore session from localStorage first, then fallback to refresh cookie
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const localUser = localStorage.getItem("ims_user");
          const localToken = localStorage.getItem("ims_token");
          if (localUser && localToken && !isTokenExpired(localToken)) {
            const parsedUser = JSON.parse(localUser);
            setSession(parsedUser, localToken);
            setIsLoading(false);
          }
        }

        const res = await apiClient.post("/auth/refresh");
        if (!cancelled) {
          setSession(res.data.user, res.data.accessToken);
        }
      } catch {
        // Only clear session if local token is missing or expired
        if (typeof window !== "undefined") {
          const localToken = localStorage.getItem("ims_token");
          if (!localToken || isTokenExpired(localToken)) {
            if (!cancelled) clearSession();
          }
        } else {
          if (!cancelled) clearSession();
        }
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
