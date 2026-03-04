import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { extractApiError } from "../lib/api";
import { isExpired, toSession } from "../lib/auth";
import { clearStoredSession, getStoredSession, setStoredSession } from "../lib/storage";
import type { AuthSession, LoginRequest, LoginResponse, SignupRequest, SignupResponse } from "../types/auth";

type AuthContextValue = {
  user: AuthSession["user"] | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function ensureValidSession(session: AuthSession | null): AuthSession | null {
  if (!session) {
    return null;
  }

  if (!session.accessToken || isExpired(session.accessTokenExpiresAt)) {
    return null;
  }

  return session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrated = ensureValidSession(getStoredSession());

    if (hydrated) {
      setSession(hydrated);
    } else {
      clearStoredSession();
      setSession(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.accessTokenExpiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      if (isExpired(session.accessTokenExpiresAt)) {
        clearStoredSession();
        setSession(null);
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session]);

  const login = useCallback(async (payload: LoginRequest) => {
    try {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      const nextSession = toSession(response.data);
      setStoredSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  }, []);

  const signup = useCallback(async (payload: SignupRequest) => {
    try {
      const response = await api.post<SignupResponse>("/auth/signup", payload);
      const nextSession = toSession(response.data);
      setStoredSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session && !isExpired(session.accessTokenExpiresAt)),
      isLoading,
      login,
      signup,
      logout
    }),
    [session, isLoading, login, signup, logout]
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
