import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiError, authApi, fetchCurrentUser, type AuthUser } from '@/lib/api';
import { clearAccessToken, loadAccessToken, saveAccessToken } from '@/lib/token-storage';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session on app start: read the stored token and validate it
  // against the backend so a stale/expired token never leaves a "ghost" session.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const token = await loadAccessToken();
        if (!token) {
          setUser(null);
          return;
        }
        const currentUser = await fetchCurrentUser();
        if (active) setUser(currentUser);
      } catch (error) {
        // Token missing, expired or backend unreachable → clear local session.
        if (error instanceof ApiError && error.status === 0) {
          // Backend is down. Keep the token so the user isn't logged out on a
          // transient network failure, but there is no user to render yet.
          if (active) setUser(null);
        } else {
          await clearAccessToken();
          if (active) setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const payload = await authApi.signIn({ email, password });
    await saveAccessToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const payload = await authApi.signUp({ name, email, password });
    await saveAccessToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const payload = await authApi.signInWithGoogle(idToken);
    await saveAccessToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await clearAccessToken();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isSignedIn: user !== null,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
