import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session via httpOnly refresh cookie
  useEffect(() => {
    api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return api.get('/auth/me');
      })
      .then(({ data }) => setUser(data))
      .catch(() => {
        // No valid session — user must log in
        clearAccessToken();
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.requires2FA) {
      return { requires2FA: true, tempToken: data.tempToken };
    }
    // Access token in memory; refresh token set as httpOnly cookie by backend
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function verify2FA(tempToken, code) {
    const { data } = await api.post('/auth/login/2fa', { tempToken, code });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — clear local state regardless
    }
    clearAccessToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
