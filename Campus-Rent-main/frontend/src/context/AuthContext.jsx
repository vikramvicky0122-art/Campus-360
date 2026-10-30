/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setOnAuthError } from "../services/api.js";

export const AuthContext = createContext(null);
const USER_KEY = "campus360_user";
const TOKEN_KEY = "campus360_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  // Register the global auth-error handler on mount
  useEffect(() => {
    setOnAuthError(() => {
      logout();
      window.location.href = '/login';
    });
    return () => setOnAuthError(null);
  }, [logout]);

  const login = (authData) => {
    const userData = authData?.user;
    const jwt = authData?.token;
    if (!userData || !jwt) {
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_KEY, jwt);
    setUser(userData);
    setToken(jwt);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
