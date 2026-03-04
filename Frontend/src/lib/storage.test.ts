import { clearStoredSession, getStoredSession, setStoredSession, storageKey } from "./storage";
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

describe("storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves auth session", () => {
    setStoredSession(sampleSession);

    expect(getStoredSession()).toEqual(sampleSession);
  });

  it("returns null for malformed storage content", () => {
    window.localStorage.setItem(storageKey(), "invalid-json");

    expect(getStoredSession()).toBeNull();
  });

  it("clears persisted session", () => {
    setStoredSession(sampleSession);
    clearStoredSession();

    expect(window.localStorage.getItem(storageKey())).toBeNull();
  });
});
