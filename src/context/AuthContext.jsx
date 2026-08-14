import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, hasSession, login, logout, restoreSession } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    // Skip the /auth/refresh call if localStorage says there's no active session.
    // This avoids unnecessary 401s on the login/register pages.
    if (!hasSession()) { setLoading(false); return; }
    setLoading(true);
    setRestoreError(null);
    restoreSession().then(session => { if (mounted) setUser(session); }).catch((error) => {
      if (!mounted) return;
      if (!error.response) setRestoreError('The WorkNest backend is unavailable. Start the API server and try again.');
      else if (error.response.status === 401) { clearSession(); setUser(null); }
      else setRestoreError(error.response?.data?.error?.message || 'Your WorkNest session could not be restored.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [restoreAttempt]);

  const value = useMemo(() => ({
    user,
    loading,
    restoreError,
    retryRestore() { setRestoreAttempt((attempt) => attempt + 1); },
    async signIn(credentials) { const session = await login(credentials); setUser(session); return session; },
    setSession: setUser,
    async signOut() { await logout(); setUser(null); }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
