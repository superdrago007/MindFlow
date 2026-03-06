import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import axios, { AxiosHeaders } from "axios";
import { applyRefresh, isExpired } from "./auth";
import { clearTokens, getPersistenceMode, getTokens, setTokens } from "./tokenStore";
import type { AuthSession, RefreshResponse } from "../types/auth";

type ApiErrorBody = {
  detail?: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type AuthHandlers = {
  onAuthFailure?: () => void;
  onTokensUpdated?: (session: AuthSession) => void;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const publicAuthPaths = ["/auth/login", "/auth/signup", "/auth/refresh"];

const handlers: AuthHandlers = {};
let refreshPromise: Promise<AuthSession> | null = null;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json"
  }
});

function isPublicAuthRequest(url?: string): boolean {
  if (!url) {
    return false;
  }

  return publicAuthPaths.some((path) => url.includes(path));
}

function notifyAuthFailure(): void {
  clearTokens();
  handlers.onAuthFailure?.();
}

async function requestRefreshToken(): Promise<AuthSession> {
  const currentSession = getTokens();
  if (!currentSession?.refreshToken || isExpired(currentSession.refreshTokenExpiresAt)) {
    throw new Error("Refresh token missing or expired");
  }

  const response = await axios.post<RefreshResponse>(`${apiBaseUrl}/auth/refresh`, null, {
    headers: {
      Authorization: `Bearer ${currentSession.refreshToken}`
    }
  });

  const rotatedSession = applyRefresh(currentSession, response.data);
  setTokens(rotatedSession, getPersistenceMode());
  handlers.onTokensUpdated?.(rotatedSession);
  return rotatedSession;
}

api.interceptors.request.use((config) => {
  const session = getTokens();
  if (!session?.accessToken) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const statusCode = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      statusCode !== 401 ||
      originalRequest._retry ||
      isPublicAuthRequest(originalRequest.url)
    ) {
      if (statusCode === 401 && originalRequest._retry) {
        notifyAuthFailure();
      }
      if (statusCode === 401 && originalRequest.url?.includes("/auth/refresh")) {
        notifyAuthFailure();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = requestRefreshToken()
          .catch((refreshError) => {
            notifyAuthFailure();
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const refreshedSession = await refreshPromise;
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set("Authorization", `Bearer ${refreshedSession.accessToken}`);
      originalRequest.headers = headers;

      return api.request(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export function configureAuthHandlers(nextHandlers: AuthHandlers): void {
  handlers.onAuthFailure = nextHandlers.onAuthFailure;
  handlers.onTokensUpdated = nextHandlers.onTokensUpdated;
}

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default api;
