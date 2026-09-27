import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth session on mount (/api/auth/me)
  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/auth/me');
      setUser(res.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
      // 401 is normal when not logged in
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axiosInstance.post('/auth/login', { email, password });
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      const res = await axiosInstance.post('/auth/register', { name, email, password });
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
