import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import {
  ChainChips,
  ErrorBanner,
  Input,
  Loader,
  PrimaryButton,
  ScreenContainer,
} from "../components";
import type { Chain } from "../types/api";
import * as api from "../services/api.service";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

function parseFiatAmount(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return n;
}

export function BuyScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [amountText, setAmountText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOpenedHint, setLastOpenedHint] = useState<string | null>(null);

  function clearFeedback() {
    setError(null);
    setLastOpenedHint(null);
  }

  async function openBuy() {
    clearFeedback();

    const fiatAmount = parseFiatAmount(amountText);
    if (amountText.trim() && fiatAmount === undefined) {
      setError("Enter a valid positive amount (e.g. 100).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.buyCrypto(chain, fiatAmount);
      const target = res.url;
      const canOpen = await Linking.canOpenURL(target);
      if (!canOpen) {
        throw new Error("Cannot open Transak URL on this device.");
      }
      await Linking.openURL(target);
      setLastOpenedHint(
        `Opened Transak for ${res.chain} · ${res.fiatAmount} ${res.fiatCurrency}`
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Loader visible={loading} overlay message="Opening Transak…" />

      <Text style={styles.kicker}>Fiat on-ramp</Text>
      <Text style={styles.title}>Buy crypto</Text>
      <Text style={styles.sub}>
        Choose network and how much fiat to spend. You will complete purchase
        in Transak (requires deposit address + Transak keys on the server).
      </Text>

      {error ? (
        <View style={styles.banner}>
          <ErrorBanner
            message={error}
            onRetry={() => void openBuy()}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.accent} />
        <Text style={styles.label}>Network</Text>
        <ChainChips
          value={chain}
          disabled={loading}
          onChange={(c) => {
            setChain(c);
            clearFeedback();
          }}
        />

        <Input
          label="Fiat amount (optional)"
          helperText="Leave empty for the server default. Currency is set on the API (e.g. USD)."
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            clearFeedback();
          }}
          placeholder="e.g. 100"
          keyboardType="decimal-pad"
          editable={!loading}
          containerStyle={styles.inputWrap}
        />

        <PrimaryButton
          title="Continue with Transak"
          onPress={() => void openBuy()}
          loading={loading}
        />
      </View>

      {lastOpenedHint ? (
        <Text style={styles.successHint}>{lastOpenedHint}</Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing.md,
  },
  kicker: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.sm,
  },
  sub: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  card: {
    position: "relative",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    paddingLeft: theme.spacing.lg + 4,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.accent,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  inputWrap: {
    marginBottom: theme.spacing.sm,
  },
  successHint: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
});
