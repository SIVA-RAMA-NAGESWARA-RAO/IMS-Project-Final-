"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("ims_user");
      localStorage.removeItem("ims_token");
    }
  }, []);

  const setSession = useCallback((newUser: User, token: string) => {
    setUser(newUser);
    setAccessToken(token);
    setAuthToken(token);
    if (typeof window !== "undefined") {
      localStorage.setItem("ims_user", JSON.stringify(newUser));
      localStorage.setItem("ims_token", token);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiClient.post("/auth/refresh");
      const { user: freshUser, accessToken: freshToken } = res.data;
      setSession(freshUser, freshToken);
      return true;
    } catch {
      // Only clear if we have NO local session at all
      if (typeof window !== "undefined") {
        const hasLocal = localStorage.getItem("ims_token");
        if (!hasLocal) {
          clearSession();
        }
      }
      return false;
    }
  }, [setSession, clearSession]);

  // On mount: restore from localStorage FIRST, then optionally try server refresh
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Step 1: Restore from localStorage instantly
      if (typeof window !== "undefined") {
        const savedUser = localStorage.getItem("ims_user");
        const savedToken = localStorage.getItem("ims_token");

        if (savedUser && savedToken) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setAccessToken(savedToken);
            setAuthToken(savedToken);
            // Session restored — mark as NOT loading immediately
            // Do NOT attempt server refresh — it will fail cross-origin
            // and cause a race condition that clears the session
            if (!cancelled) setIsLoading(false);
            return; // ← CRITICAL: stop here, don't call /auth/refresh
          } catch {
            localStorage.removeItem("ims_user");
            localStorage.removeItem("ims_token");
          }
        }
      }

      // Step 2: No local session → try cookie-based refresh (same-origin only)
      try {
        const res = await apiClient.post("/auth/refresh");
        if (!cancelled) {
          setSession(res.data.user, res.data.accessToken);
        }
      } catch {
        // No session anywhere — user needs to log in
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();
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
