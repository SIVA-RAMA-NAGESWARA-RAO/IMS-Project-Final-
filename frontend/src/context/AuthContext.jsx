import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { setAccessToken, setOnAuthFailure } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to silently restore a session from the httpOnly refresh
  // cookie (survives reloads) — the in-memory access token does not.
  useEffect(() => {
    setOnAuthFailure(() => setUser(null));

    authApi
      .refresh()
      .then(({ user: me, accessToken }) => {
        setAccessToken(accessToken);
        setUser(me);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const result = await authApi.login({ email, password });
    if (result.requiresOtp) {
      return result;
    }
    const { user: loggedInUser, accessToken } = result;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const completeLogin = async (tempToken, code) => {
    const { user: loggedInUser, accessToken } = await authApi.verifyLoginOtp({ tempToken, code });
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = (payload) => authApi.register(payload); // returns { email } — caller routes to OTP verification

  const verifyOtp = async (email, code) => {
    const { user: verifiedUser, accessToken } = await authApi.verifyOtp(email, code);
    setAccessToken(accessToken);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, completeLogin, register, verifyOtp, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
