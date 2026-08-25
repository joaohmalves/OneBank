import { createContext, useContext, useState, type ReactNode } from 'react';
interface AuthValue { authenticated: boolean; login: (user:string, password:string) => boolean; logout: () => void; }
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) { const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('onebank-auth') === '1'); const login = (u:string,p:string) => { const ok=u==='usuario'&&p==='123'; if(ok){sessionStorage.setItem('onebank-auth','1');setAuthenticated(true);} return ok; }; const logout=()=>{sessionStorage.removeItem('onebank-auth');setAuthenticated(false);}; return <AuthContext.Provider value={{authenticated,login,logout}}>{children}</AuthContext.Provider>; }
export const useAuth = () => { const value=useContext(AuthContext); if(!value) throw new Error('useAuth deve estar dentro de AuthProvider'); return value; };
