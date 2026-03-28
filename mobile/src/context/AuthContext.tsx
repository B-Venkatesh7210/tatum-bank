import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setAuthToken, getAuthToken } from "../services/api";
import * as api from "../services/api.service";

type AuthState = {
  token: string | null;
  isReady: boolean;
  email: string | null;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtEmail(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const data = JSON.parse(json) as { email?: string };
    return typeof data.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getAuthToken();
        if (!cancelled && stored) {
          setToken(stored);
          setEmail(decodeJwtEmail(stored));
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (e: string, password: string) => {
    const { token: t } = await api.login(e.trim(), password);
    await setAuthToken(t);
    setToken(t);
    setEmail(decodeJwtEmail(t) ?? e.trim().toLowerCase());
  }, []);

  const register = useCallback(async (e: string, password: string) => {
    const { token: t } = await api.register(e.trim(), password);
    await setAuthToken(t);
    setToken(t);
    setEmail(decodeJwtEmail(t) ?? e.trim().toLowerCase());
  }, []);

  const logout = useCallback(async () => {
    await setAuthToken(null);
    setToken(null);
    setEmail(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      email,
      isReady,
      login,
      register,
      logout,
    }),
    [token, email, isReady, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
