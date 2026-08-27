import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthValue {
  authenticated: boolean;
  login: (user: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('onebank-auth') === '1',
  );

  const login = (u: string, p: string) => {
    const ok = u === 'usuario' && p === '123';
    if (ok) {
      sessionStorage.setItem('onebank-auth', '1');
      setAuthenticated(true);
    }
    return ok;
  };

  const logout = () => {
    sessionStorage.removeItem('onebank-auth');
    setAuthenticated(false);
  };

  useEffect(() => {
    if (authenticated) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/redeem-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          console.warn('[AuthContext] redeem-code falhou, seguindo pro login simulado');
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        sessionStorage.setItem('onebank-auth', '1');
        if (data?.user) {
          sessionStorage.setItem('onebank-user', JSON.stringify(data.user));
        }
        setAuthenticated(true);
      } catch (err) {
        console.error('[AuthContext] erro ao resgatar code', err);
      } finally {
        if (!cancelled) {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState(null, '', url.toString());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve estar dentro de AuthProvider');
  return value;
};