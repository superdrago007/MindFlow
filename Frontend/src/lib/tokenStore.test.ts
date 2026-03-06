import { clearTokens, getTokens, hydrateTokensFromSessionStorage, setTokens, tokenStoreSessionKey } from "./tokenStore";
import type { AuthSession } from "../types/auth";

const sampleSession: AuthSession = {
  accessToken: "access",
  refreshToken: "refresh",
  accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  refreshTokenExpiresAt: "2099-01-08T00:00:00.000Z",
  user: {
    username: "alice",
    email: "alice@example.com",
    role: "user",
    fullName: "Alice",
    isActive: true,
    profilePic: null
  }
};

describe("token store", () => {
  beforeEach(() => {
    clearTokens();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores tokens in memory mode without persistence", () => {
    setTokens(sampleSession, "memory");

    expect(getTokens()).toEqual(sampleSession);
    expect(window.sessionStorage.getItem(tokenStoreSessionKey())).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("stores tokens in session mode using sessionStorage", () => {
    setTokens(sampleSession, "session");

    expect(window.sessionStorage.getItem(tokenStoreSessionKey())).toContain("access");
    expect(window.localStorage.length).toBe(0);
  });

  it("hydrates from sessionStorage when remember-me data exists", () => {
    window.sessionStorage.setItem(tokenStoreSessionKey(), JSON.stringify(sampleSession));

    const hydrated = hydrateTokensFromSessionStorage();
    expect(hydrated).toEqual(sampleSession);
    expect(getTokens()).toEqual(sampleSession);
  });
});
