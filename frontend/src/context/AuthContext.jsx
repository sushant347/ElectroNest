/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import config from '../Config/Config';

const AuthContext = createContext(null);

const normalizeUser = (userData) => {
  if (!userData) return userData;
  const role = String(userData.role || 'customer').trim().toLowerCase();
  return { ...userData, role };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const decodeJwtPayload = (token) => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const handleAuthLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    // Restore persisted user from localStorage
    const storedUser = localStorage.getItem('customer_user');
    const token = localStorage.getItem(config.AUTH_TOKEN_KEY);
    const refreshToken = localStorage.getItem(config.REFRESH_TOKEN_KEY);

    if (storedUser && token) {
      try {
        // Basic JWT expiry check (decode payload without verification)
        const payload = decodeJwtPayload(token);
        const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false;

        if (isExpired && refreshToken) {
          // Token expired but refresh token exists — try to refresh silently
          const refreshPayload = decodeJwtPayload(refreshToken);
          const isCustomer = refreshPayload?.user_type === 'customer';
          const refreshUrl = isCustomer
            ? `${config.API_BASE_URL}/auth/refresh-customer/`
            : `${config.API_BASE_URL}/auth/refresh/`;

          fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Refresh failed');
              return res.json();
            })
            .then((data) => {
              const currentUser = localStorage.getItem('customer_user');
              const currentToken = localStorage.getItem(config.AUTH_TOKEN_KEY);
              const currentRefresh = localStorage.getItem(config.REFRESH_TOKEN_KEY);
              if (currentUser !== storedUser || currentToken !== token || currentRefresh !== refreshToken) {
                return;
              }
              localStorage.setItem(config.AUTH_TOKEN_KEY, data.access);
              if (data.refresh) localStorage.setItem(config.REFRESH_TOKEN_KEY, data.refresh);
              setUser(normalizeUser(JSON.parse(storedUser)));
            })
            .catch(() => {
              // Refresh failed — clear everything
              localStorage.removeItem('customer_user');
              localStorage.removeItem(config.AUTH_TOKEN_KEY);
              localStorage.removeItem(config.REFRESH_TOKEN_KEY);
              setUser(null);
            })
            .finally(() => setInitialized(true));
          return; // Don't setInitialized yet — wait for refresh
        } else if (isExpired) {
          // Token expired and no refresh token — clear everything
          localStorage.removeItem('customer_user');
          localStorage.removeItem(config.AUTH_TOKEN_KEY);
          localStorage.removeItem(config.REFRESH_TOKEN_KEY);
        } else {
          const u = normalizeUser(JSON.parse(storedUser));
          setUser(u);
        }
      } catch (e) {
        console.error("Failed to parse user data", e);
        localStorage.removeItem('customer_user');
        localStorage.removeItem(config.AUTH_TOKEN_KEY);
        localStorage.removeItem(config.REFRESH_TOKEN_KEY);
      }
    } else {
      // If token is missing but user exists (or vice versa), clear both
      localStorage.removeItem('customer_user');
      localStorage.removeItem(config.AUTH_TOKEN_KEY);
      localStorage.removeItem(config.REFRESH_TOKEN_KEY);
    }

    setInitialized(true);
  }, []);

  const login = (userData) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    localStorage.setItem('customer_user', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('customer_user');
    localStorage.removeItem(config.AUTH_TOKEN_KEY);
    localStorage.removeItem(config.REFRESH_TOKEN_KEY);
  };

  const isCustomer = !user || user.role === 'customer';
  const isOwner = user?.role === 'owner';
  const isWarehouse = user?.role === 'warehouse';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isCustomer, isOwner, isWarehouse, isAdmin, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
