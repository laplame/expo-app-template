import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  authLogin,
  authLogout,
  authMe,
  authRefresh,
  type AuthUser,
} from '../services/authApi';
import {
  clearAuthTokens,
  getAuthAccessToken,
  getAuthRefreshToken,
  setAuthTokens,
  setUserId,
} from '../services/storage';
import {
  devTokenForTestUser,
  findTestUserByLogin,
  isAuthDevModeEnabled,
  testUserToAuthUser,
} from '../config/authTestUsers';
import {
  resolveEffectiveRole,
  resolvePrimaryRole,
  type AppEffectiveRole,
  type AppPrimaryRole,
  userHasPermission,
  type AuthPermission,
} from '../types/authRoles';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  effectiveRole: AppEffectiveRole;
  primaryRole: AppPrimaryRole;
  isDevSession: boolean;
  error: string | null;
  hasPermission: (permission: AuthPermission) => boolean;
  login: (login: string, password: string) => Promise<{
    ok: boolean;
    error?: string;
    effectiveRole?: AppEffectiveRole;
  }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isDevToken(token: string | null | undefined): boolean {
  return !!token?.startsWith('dev.');
}

async function restoreDevUser(token: string): Promise<AuthUser | null> {
  const parts = token.split('.');
  if (parts.length < 3 || parts[0] !== 'dev') return null;
  const userId = parts.slice(1, -1).join('.');
  const { AUTH_TEST_USERS, testUserToAuthUser: toUser } = await import('../config/authTestUsers');
  const match = AUTH_TEST_USERS.find((u) => u.id === userId);
  return match ? toUser(match) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDevSession, setIsDevSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRole = useMemo(() => resolveEffectiveRole(user), [user]);
  const primaryRole = useMemo(() => resolvePrimaryRole(user), [user]);

  const hasPermission = useCallback(
    (permission: AuthPermission) => userHasPermission(user, permission),
    [user]
  );

  const applySession = useCallback(
    async (token: string | null, nextUser: AuthUser | null, dev: boolean) => {
      setAccessToken(token);
      setUser(nextUser);
      setIsDevSession(dev);
      setStatus(nextUser && token ? 'authenticated' : 'unauthenticated');
      if (nextUser?.id) await setUserId(String(nextUser.id));
    },
    []
  );

  const refreshSession = useCallback(async () => {
    setError(null);
    const token = await getAuthAccessToken();
    if (!token) {
      await applySession(null, null, false);
      return;
    }

    if (isDevToken(token)) {
      const devUser = await restoreDevUser(token);
      if (devUser) {
        await applySession(token, devUser, true);
        return;
      }
      await clearAuthTokens();
      await applySession(null, null, false);
      return;
    }

    const me = await authMe(token);
    if (me.ok && me.user) {
      await applySession(token, me.user, false);
      return;
    }

    const refresh = await getAuthRefreshToken();
    if (refresh) {
      const refreshed = await authRefresh(refresh);
      if (refreshed.ok && refreshed.token) {
        await setAuthTokens(refreshed.token, refreshed.refreshToken ?? refresh);
        const me2 = refreshed.user ?? (await authMe(refreshed.token)).user;
        if (me2) {
          await applySession(refreshed.token, me2, false);
          return;
        }
      }
    }

    await clearAuthTokens();
    await applySession(null, null, false);
    setError(me.error ?? 'Sesión expirada');
  }, [applySession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshSession();
    });
    return () => sub.remove();
  }, [refreshSession]);

  const login = useCallback(
    async (loginValue: string, password: string) => {
      setError(null);

      if (isAuthDevModeEnabled()) {
        const test = findTestUserByLogin(loginValue, password);
        if (test) {
          const token = devTokenForTestUser(test);
          const authUser = testUserToAuthUser(test);
          await setAuthTokens(token, null);
          await applySession(token, authUser, true);
          return { ok: true, effectiveRole: resolveEffectiveRole(authUser) };
        }
      }

      const res = await authLogin({ login: loginValue.trim(), password });
      if (!res.ok || !res.token) {
        const msg = res.error ?? 'Error de inicio de sesión';
        setError(msg);
        return { ok: false, error: msg };
      }
      await setAuthTokens(res.token, res.refreshToken ?? null);
      const meUser = res.user ?? (await authMe(res.token)).user;
      if (!meUser) {
        await clearAuthTokens();
        const msg = 'No se pudo obtener el perfil del usuario';
        setError(msg);
        return { ok: false, error: msg };
      }
      await applySession(res.token, meUser, false);
      return { ok: true, effectiveRole: resolveEffectiveRole(meUser) };
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    setError(null);
    const refresh = await getAuthRefreshToken();
    if (refresh && !isDevSession) {
      await authLogout(refresh);
    }
    await clearAuthTokens();
    await applySession(null, null, false);
  }, [applySession, isDevSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      effectiveRole,
      primaryRole,
      isDevSession,
      error,
      hasPermission,
      login,
      logout,
      refreshSession,
    }),
    [
      status,
      user,
      accessToken,
      effectiveRole,
      primaryRole,
      isDevSession,
      error,
      hasPermission,
      login,
      logout,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
