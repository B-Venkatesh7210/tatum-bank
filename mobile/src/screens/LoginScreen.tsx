import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PrimaryButton,
  ScreenContainer,
  TextField,
} from "../components";
import { useAuth } from "../hooks/useAuth";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Tatum Bank</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Create an account" : "Sign in to continue"}
        </Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!loading}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        title={isRegister ? "Register" : "Login"}
        onPress={onSubmit}
        loading={loading}
        disabled={!email || password.length < 8}
      />

      <PrimaryButton
        title={isRegister ? "Have an account? Login" : "Need an account? Register"}
        onPress={() => {
          setIsRegister(!isRegister);
          setError(null);
        }}
        variant="outline"
        disabled={loading}
        style={styles.switchBtn}
      />

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
      ) : null}

      <Text style={styles.hint}>
        API: {process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000"}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  switchBtn: {
    marginTop: theme.spacing.md,
  },
  spinner: {
    marginTop: theme.spacing.md,
  },
  hint: {
    marginTop: theme.spacing.xl,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
