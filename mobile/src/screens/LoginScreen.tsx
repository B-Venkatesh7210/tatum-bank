import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "../components";
import { useAuth } from "../hooks/useAuth";
import { getAuthToken } from "../services/api";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

/**
 * Backend `/auth/login` requires `{ email, password }` (min 8 chars).
 * For a single-field “email only” UX, we send this fixed password.
 * Register the same user first with this password, or change it to match your account.
 */
const DEMO_LOGIN_PASSWORD = "password12345";

function decodeJwtSub(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const data = JSON.parse(json) as { sub?: string };
    return typeof data.sub === "string" ? data.sub : null;
  } catch {
    return null;
  }
}

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    Keyboard.dismiss();
    setError(null);
    setUserId(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email");
      return;
    }

    setLoading(true);
    try {
      await login(trimmed, DEMO_LOGIN_PASSWORD);
      const token = await getAuthToken();
      const sub = token ? decodeJwtSub(token) : null;
      setUserId(sub);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <View style={styles.card}>
          <View style={styles.accentRule} />

          <Text style={styles.brand}>Tatum Bank</Text>
          <Text style={styles.headline}>Sign in</Text>
          <Text style={styles.sub}>
            Enter your work email to access your wallet.
          </Text>

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
            style={styles.input}
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {userId ? (
            <Text style={styles.userIdLine} numberOfLines={2}>
              User ID: {userId}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void onSubmit()}
            disabled={loading || !email.trim()}
            style={({ pressed }) => [
              styles.cta,
              (!email.trim() || loading) && styles.ctaDisabled,
              pressed && email.trim() && !loading && styles.ctaPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaLabel}>Continue</Text>
            )}
          </Pressable>

          <Text style={styles.footnote}>
            Demo mode: password is fixed for API compatibility. Register with
            email + password &quot;{DEMO_LOGIN_PASSWORD}&quot; first, or use an
            account that uses this password.
          </Text>

          <Text style={styles.apiHint}>
            {process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000"}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  accentRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    marginBottom: theme.spacing.lg,
  },
  brand: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  headline: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  inputLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  error: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
  userIdLine: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: "500",
  },
  cta: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaPressed: {
    backgroundColor: theme.colors.accentPressed,
  },
  ctaLabel: {
    color: "#FFFFFF",
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
  footnote: {
    marginTop: theme.spacing.lg,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
  },
  apiHint: {
    marginTop: theme.spacing.md,
    fontSize: 10,
    color: theme.colors.textMuted,
    opacity: 0.7,
  },
});
