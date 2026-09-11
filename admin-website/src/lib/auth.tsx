import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, authApi, clearToken, loadToken, saveToken, type AuthUser } from './api';

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a stored session on load, and drop it if the token is stale or the
  // account is no longer an admin.
  useEffect(() => {
    if (!loadToken()) {
      setIsLoading(false);
      return;
    }

    let active = true;
    authApi
      .me()
      .then((restored) => {
        if (!active) return;
        if (restored.role === 'ADMIN') {
          setUser(restored);
        } else {
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);

    // This dashboard is admin-only. A coach or client has valid credentials
    // and would otherwise end up signed in to a UI that 403s on every call,
    // so the session is refused here rather than half-working.
    if (result.user.role !== 'ADMIN') {
      throw new ApiError(403, 'That account is not an administrator.');
    }

    saveToken(result.accessToken);
    setUser(result.user);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
