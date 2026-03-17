import React, { createContext, useState, useContext, useEffect } from 'react';
import config from '../Config/Config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

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
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired && refreshToken) {
          // Token expired but refresh token exists — try to refresh silently
          fetch(`${config.API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Refresh failed');
              return res.json();
            })
            .then((data) => {
              localStorage.setItem(config.AUTH_TOKEN_KEY, data.access);
              if (data.refresh) localStorage.setItem(config.REFRESH_TOKEN_KEY, data.refresh);
              setUser(JSON.parse(storedUser));
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
          setUser(JSON.parse(storedUser));
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
    setUser(userData);
    localStorage.setItem('customer_user', JSON.stringify(userData));
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
