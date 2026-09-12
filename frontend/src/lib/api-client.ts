import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.trim() || "/api";

export const apiClient = axios.create({
  baseURL,
  timeout: 120_000,
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? String(d)).join(", ");
    }
    if (error.response?.status === 404) return "Resource not found.";
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
