import axios from "axios";

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      if (err.code === "ECONNABORTED") {
        return "Request timed out. Check your connection and API URL.";
      }
      return "Network error. Check EXPO_PUBLIC_API_URL and that the server is running.";
    }
    const data = err.response.data as { error?: string } | undefined;
    if (data?.error) {
      return data.error;
    }
    const status = err.response.status;
    if (status === 401) {
      return "Session expired or invalid. Please sign in again.";
    }
    if (status === 503) {
      return "Service temporarily unavailable. Try again shortly.";
    }
    return `Request failed (${status})`;
  }
  return err instanceof Error ? err.message : String(err);
}
