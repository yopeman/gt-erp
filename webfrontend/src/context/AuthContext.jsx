import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gt_erp_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('gt_erp_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/users/me');
        if (response.success && response.data) {
          setUser(response.data);
          localStorage.setItem('gt_erp_user', JSON.stringify(response.data));
        }
      } catch (err) {
        console.warn('Session verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/users/login', { email, password });
    if (response.success && response.token) {
      setToken(response.token);
      setUser(response.data);
      localStorage.setItem('gt_erp_token', response.token);
      localStorage.setItem('gt_erp_user', JSON.stringify(response.data));
      return response.data;
    }
    throw new Error(response.message || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gt_erp_token');
    localStorage.removeItem('gt_erp_user');
  };

  const hasRole = (roles = []) => {
    if (!user) return false;
    const userRoles = user.roles || [];
    if (userRoles.includes('admin')) return true;
    if (typeof roles === 'string') return userRoles.includes(roles);
    return roles.some((role) => userRoles.includes(role));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
