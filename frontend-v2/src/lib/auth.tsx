/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import http, { setAuthToken } from './http';

export interface AuthUser {
  id: string;
  nome: string;
  usuario_login?: string;
  papel: 'admin' | 'membro';
  deve_trocar_senha?: number;
}

interface LoginPayload {
  usuario_login: string;
  senha: string;
}

interface LoginResponse {
  token: string;
  usuario: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentUserId?: string;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
}

const TOKEN_KEY = 'ea_token';
const USER_KEY = 'ea_user';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function persistStoredSession(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    clearStoredSession();
    setUser(null);
  }, []);

  const applySession = useCallback((token: string, nextUser: AuthUser) => {
    setAuthToken(token);
    persistStoredSession(token, nextUser);
    setUser(nextUser);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = readStoredToken();

    if (!token) {
      clearSession();
      return null;
    }

    setAuthToken(token);

    try {
      const currentUser = await http.get<AuthUser>('/auth/me');
      applySession(token, currentUser);
      return currentUser;
    } catch {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const token = readStoredToken();

      if (!token) {
        setAuthToken(null);
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      await refreshSession();

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await http.post<LoginResponse>('/auth/login', payload);
      applySession(response.token, response.usuario);
      return response.usuario;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      // Mantem logout local mesmo se a sessao do servidor ja tiver expirado.
    }

    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.papel === 'admin',
      currentUserId: user?.id,
      login,
      logout,
      refreshSession,
    }),
    [user, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

