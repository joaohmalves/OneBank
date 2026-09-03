import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ============================================================
// Fonte da verdade da autenticação
// ============================================================
// `authenticated` só é ligado por um caminho: o redeem, no backend,
// do código de troca (exchange code) gerado pelo DemoHub quando o
// usuário abre a demo OneBank a partir de lá.
//
// O formulário de login (usuário/senha) que existe na página é
// mantido apenas como SIMULAÇÃO visual do banco para a demo — ele
// nunca autentica sozinho. Se alguém abrir o OneBank direto (sem
// passar pelo DemoHub) e "logar" com usuario/123, o app reconhece
// que as credenciais estão corretas, mas recusa o acesso porque
// não existe uma sessão real (token) por trás.
// ============================================================

export type LoginResult = 'ok' | 'invalid-credentials' | 'no-token';

interface AuthValue {
  authenticated: boolean;
  /** Login mock: valida usuário/senha, mas só libera o dashboard
   * se já houver uma sessão real (token do DemoHub) resgatada. */
  login: (user: string, password: string) => LoginResult;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Sessão real (token). É o único flag que controla as rotas protegidas.
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('onebank-auth') === '1',
  );

  const login = (u: string, p: string): LoginResult => {
    const credentialsOk = u === 'usuario' && p === '123';

    if (!credentialsOk) {
      return 'invalid-credentials';
    }

    // Credenciais mock corretas, mas isso é só teatro de demo.
    // O acesso real só é concedido se já existir uma sessão vinda
    // do token resgatado do DemoHub.
    if (!authenticated) {
      return 'no-token';
    }

    return 'ok';
  };

  const logout = () => {
    sessionStorage.removeItem('onebank-auth');
    sessionStorage.removeItem('onebank-user');
    setAuthenticated(false);
  };

  // ============================================================
  // Único ponto que liga `authenticated`: resgate do código de
  // handoff (?code=...) recebido ao abrir esta página pelo DemoHub.
  // ============================================================
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
          console.warn('[AuthContext] redeem-code falhou; sem sessão real, login mock ficará bloqueado.');
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
