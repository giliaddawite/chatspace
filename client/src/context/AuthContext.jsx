import { createContext, useContext, useEffect, useState } from 'react';
import { API, setAuthRef } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState(null); // { access_token, refresh_token }

  // Keep the interceptor's module-level refs in sync on every auth change.
  useEffect(() => {
    setAuthRef(auth, setAuth);
  }, [auth]);

  // Sync the Authorization header whenever the access token changes.
  useEffect(() => {
    if (auth?.access_token) {
      API.defaults.headers.common.Authorization = `Bearer ${auth.access_token}`;
    } else {
      delete API.defaults.headers.common.Authorization;
    }
  }, [auth]);

  const _applySession = (data) => {
    setUser(data.user);
    setAuth({ access_token: data.access_token, refresh_token: data.refresh_token });
    API.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
  };

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    _applySession(res.data.data);
  };

  const register = async (username, email, password) => {
    const res = await API.post('/auth/register', { username, email, password });
    _applySession(res.data.data);
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (e) {
      // ignore — clear state regardless
    }
    setUser(null);
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ user, auth, login, register, logout, isAuthenticated: !!auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
