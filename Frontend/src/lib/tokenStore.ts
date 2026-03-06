import type { AuthSession } from "../types/auth";

export type PersistenceMode = "memory" | "session";

const TOKEN_STORAGE_KEY = "mindflow.auth.session";

let sessionInMemory: AuthSession | null = null;
let persistenceMode: PersistenceMode = "memory";
let isHydrated = false;

export function setTokens(session: AuthSession, mode: PersistenceMode): void {
  sessionInMemory = session;
  persistenceMode = mode;

  if (mode === "session") {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getTokens(): AuthSession | null {
  return sessionInMemory;
}

export function getPersistenceMode(): PersistenceMode {
  return persistenceMode;
}

export function clearTokens(): void {
  sessionInMemory = null;
  persistenceMode = "memory";
  isHydrated = false;
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function hydrateTokensFromSessionStorage(): AuthSession | null {
  if (isHydrated) {
    return sessionInMemory;
  }

  isHydrated = true;
  const raw = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    sessionInMemory = parsed;
    persistenceMode = "session";
    return parsed;
  } catch {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionInMemory = null;
    persistenceMode = "memory";
    return null;
  }
}

export function tokenStoreSessionKey(): string {
  return TOKEN_STORAGE_KEY;
}
