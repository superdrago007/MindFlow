import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { configureAuthHandlers, extractApiError } from "../lib/api";
import { isExpired, toSession } from "../lib/auth";
import {
  clearTokens,
  getTokens,
  hydrateTokensFromSessionStorage,
  setTokens,
  type PersistenceMode
} from "../lib/tokenStore";
import type { AuthSession, LoginRequest, LoginResponse, SignupRequest, SignupResponse } from "../types/auth";

type AuthContextValue = {
  user: AuthSession["user"] | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest, rememberMe: boolean) => Promise<void>;
  signup: (payload: SignupRequest, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  handleAuthFailure: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function ensureValidSession(session: AuthSession | null): AuthSession | null {
  if (!session) {
    return null;
  }

  if (!session.accessToken || !session.refreshToken || isExpired(session.refreshTokenExpiresAt)) {
    return null;
  }

  return session;
}

function modeFromRememberMe(rememberMe: boolean): PersistenceMode {
  return rememberMe ? "session" : "memory";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthFailure = useCallback(() => {
    clearTokens();
    setSession(null);
  }, []);

  useEffect(() => {
    const hydrated = ensureValidSession(hydrateTokensFromSessionStorage());

    if (hydrated) {
      setSession(hydrated);
    } else {
      handleAuthFailure();
    }

    setIsLoading(false);
  }, [handleAuthFailure]);

  useEffect(() => {
    configureAuthHandlers({
      onAuthFailure: handleAuthFailure,
      onTokensUpdated: (nextSession) => {
        setSession(nextSession);
      }
    });

    return () => {
      configureAuthHandlers({});
    };
  }, [handleAuthFailure]);

  useEffect(() => {
    if (!session?.refreshTokenExpiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      const currentSession = getTokens();
      if (!currentSession || isExpired(currentSession.refreshTokenExpiresAt)) {
        handleAuthFailure();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session?.refreshTokenExpiresAt, handleAuthFailure]);

  const login = useCallback(async (payload: LoginRequest, rememberMe: boolean) => {
    try {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      const nextSession = toSession(response.data);
      setTokens(nextSession, modeFromRememberMe(rememberMe));
      setSession(nextSession);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  }, []);

  const signup = useCallback(async (payload: SignupRequest, rememberMe: boolean) => {
    try {
      const response = await api.post<SignupResponse>("/auth/signup", payload);
      const nextSession = toSession(response.data);
      setTokens(nextSession, modeFromRememberMe(rememberMe));
      setSession(nextSession);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  }, []);

  const logout = useCallback(() => {
    handleAuthFailure();
  }, [handleAuthFailure]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session && !isExpired(session.refreshTokenExpiresAt)),
      isLoading,
      login,
      signup,
      logout,
      handleAuthFailure
    }),
    [session, isLoading, login, signup, logout, handleAuthFailure]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
