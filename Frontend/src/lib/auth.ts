import type { AuthResponse, AuthSession, RefreshResponse } from "../types/auth";

export function toExpiryTimestamp(expiresInSeconds: number): string {
  const safeSeconds = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 0;
  return new Date(Date.now() + safeSeconds * 1000).toISOString();
}

export function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const expiryMs = Date.parse(expiresAt);
  if (Number.isNaN(expiryMs)) {
    return true;
  }

  return Date.now() >= expiryMs;
}

export function minutesUntilExpiry(expiresAt?: string | null): number {
  if (!expiresAt) {
    return 0;
  }

  const expiryMs = Date.parse(expiresAt);
  if (Number.isNaN(expiryMs)) {
    return 0;
  }

  const remainingMs = Math.max(0, expiryMs - Date.now());
  return Math.ceil(remainingMs / (60 * 1000));
}

export function toSession(response: AuthResponse): AuthSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: toExpiryTimestamp(response.access_token_expires_in),
    refreshTokenExpiresAt: toExpiryTimestamp(response.refresh_token_expires_in),
    user: {
      username: response.username,
      email: response.email ?? null,
      role: response.role,
      fullName: "full_name" in response ? response.full_name ?? null : null,
      isActive: "is_active" in response ? response.is_active : undefined,
      profilePic: response.profile_pic ?? null
    }
  };
}

export function applyRefresh(session: AuthSession, response: RefreshResponse): AuthSession {
  return {
    ...session,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: toExpiryTimestamp(response.access_token_expires_in),
    refreshTokenExpiresAt: toExpiryTimestamp(response.refresh_token_expires_in)
  };
}
