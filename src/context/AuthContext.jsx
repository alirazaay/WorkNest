import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login, logout, restoreSession } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Only attempt restore if a refresh cookie is likely present (avoids wasted 401 on public pages).
    const hasSession = document.cookie.includes('worknest_refresh');
    if (!hasSession) { setLoading(false); return; }
    restoreSession().then(session => { if (mounted) setUser(session); }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
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
