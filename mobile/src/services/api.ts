import axios, { type AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_STORAGE_KEY = "@tatum_bank_token";

/** Override with EXPO_PUBLIC_API_URL (e.g. http://10.0.2.2:3000 for Android emulator). */
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";
}

let client: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 60_000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  return client;
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}
