import React, { useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ChainChips,
  PrimaryButton,
  ScreenContainer,
} from "../components";
import type { Chain } from "../types/api";
import * as api from "../services/tatumBankApi";
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

/**
 * GET /buy?chain=&fiatAmount= → `{ url, walletAddress, ... }` then opens Transak in the browser.
 */
export function BuyScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [amountText, setAmountText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOpenedHint, setLastOpenedHint] = useState<string | null>(null);

  async function openBuy() {
    setError(null);
    setLastOpenedHint(null);

    const fiatAmount = parseFiatAmount(amountText);
    if (amountText.trim() && fiatAmount === undefined) {
      setError("Enter a valid positive amount (e.g. 100).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.fetchBuyUrl(chain, fiatAmount);
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
      <Text style={styles.kicker}>Fiat on-ramp</Text>
      <Text style={styles.title}>Buy crypto</Text>
      <Text style={styles.sub}>
        Choose network and how much fiat to spend. You will complete purchase
        in Transak (requires deposit address + Transak keys on the server).
      </Text>

      <View style={styles.card}>
        <View style={styles.accent} />
        <Text style={styles.label}>Network</Text>
        <ChainChips value={chain} onChange={setChain} />

        <Text style={styles.label}>Fiat amount (optional)</Text>
        <Text style={styles.hintInput}>
          Leave empty to use the server default. Currency is set on the API
          (e.g. USD).
        </Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="e.g. 100"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
          editable={!loading}
          style={styles.input}
        />

        <PrimaryButton
          title="Continue with Transak"
          onPress={() => void openBuy()}
          loading={loading}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lastOpenedHint ? (
        <Text style={styles.successHint}>{lastOpenedHint}</Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  hintInput: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 16,
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
    marginBottom: theme.spacing.lg,
  },
  error: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  },
  successHint: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
});
