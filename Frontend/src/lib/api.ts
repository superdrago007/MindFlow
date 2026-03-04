import type { AxiosError } from "axios";
import axios from "axios";
import { getStoredSession } from "./storage";

type ApiErrorBody = {
  detail?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const session = getStoredSession();

  if (session?.accessToken) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${session.accessToken}`;
    config.headers = headers as never;
  }

  return config;
});

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
