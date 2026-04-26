import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as apiLogin } from '../api/gasApi';
import { ROLES } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('acclaw_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('acclaw_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('acclaw_user');
    }
  }, [user]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiLogin({ username, password });
      if (result.status === 'success') {
        setUser(result.data);
        return true;
      } else {
        setError(result.message || '登入失敗');
        return false;
      }
    } catch (err) {
      setError('連線失敗，請稍後再試');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('acclaw_user');
  }, []);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isSenior = user?.role === ROLES.SENIOR;
  const canViewAll = isAdmin || isSenior;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, isAdmin, isSenior, canViewAll, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
