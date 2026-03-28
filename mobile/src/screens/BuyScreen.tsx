import React, { useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChainChips, PrimaryButton, ScreenContainer } from "../components";
import type { Chain } from "../types/api";
import * as api from "../services/tatumBankApi";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

/**
 * Opens Transak widget URL from GET /buy (requires deposit address + Transak env on backend).
 */
export function BuyScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.fetchBuyUrl(chain);
      const canOpen = await Linking.canOpenURL(res.url);
      if (!canOpen) {
        throw new Error("Cannot open widget URL");
      }
      await Linking.openURL(res.url);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Buy crypto</Text>
      <Text style={styles.sub}>
        Fiat on-ramp via Transak (configure backend + deposit address first).
      </Text>
      <Text style={styles.label}>Network</Text>
      <ChainChips value={chain} onChange={setChain} />
      <PrimaryButton
        title="Open Transak"
        onPress={() => void openBuy()}
        loading={loading}
        style={styles.btn}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sub: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
  },
  btn: {
    marginTop: theme.spacing.lg,
  },
  error: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
  },
});
