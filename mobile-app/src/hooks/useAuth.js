import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from secure storage on app launch
    AsyncStorage.getItem('auth_token').then(savedToken => {
      if (savedToken) {
        setToken(savedToken);
        setIsAuthenticated(true);
      }
      setLoading(false);
    });
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await AsyncStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user || { username });
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, currentUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
