import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { getToken, setToken, clearToken } from './tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await authApi.getMe();
        setUser(me);
      } catch (e) {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const { token, user: newUser } = await authApi.signup({ email, password, name });
    await setToken(token);
    setUser(newUser);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { token, user: loggedInUser } = await authApi.login({ email, password });
    await setToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore network errors on logout, still clear local state
    }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signup, login, logout }),
    [user, loading, signup, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
