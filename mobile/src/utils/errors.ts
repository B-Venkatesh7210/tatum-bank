import axios from "axios";

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) {
      return data.error;
    }
    if (err.response?.status) {
      return `Request failed (${err.response.status})`;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
