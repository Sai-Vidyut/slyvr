import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL?.trim() || "/api";

export const apiClient = axios.create({
  baseURL,
  timeout: 120_000,
});

type TokenGetter = () => string | null;
type LibraryIdGetter = () => number | null;

let getAccessToken: TokenGetter = () => null;
let getActiveLibraryId: LibraryIdGetter = () => null;

export function configureApiAuth(options: {
  getAccessToken: TokenGetter;
  getActiveLibraryId: LibraryIdGetter;
}) {
  getAccessToken = options.getAccessToken;
  getActiveLibraryId = options.getActiveLibraryId;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const libraryId = getActiveLibraryId();
  if (libraryId != null) {
    config.headers["X-Library-Id"] = String(libraryId);
  }
  return config;
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? String(d)).join(", ");
    }
    if (error.response?.status === 401) return "Sign in required.";
    if (error.response?.status === 403) return "You do not have access to this library.";
    if (error.response?.status === 404) return "Resource not found.";
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
