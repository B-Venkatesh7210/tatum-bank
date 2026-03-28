import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  ChainChips,
  Card,
  PrimaryButton,
  ScreenContainer,
  TextField,
} from "../components";
import type { Chain } from "../types/api";
import * as api from "../services/tatumBankApi";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

export function WithdrawScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.requestWithdrawal({
        chain,
        amount: amount.trim(),
        destinationAddress: destinationAddress.trim(),
      });
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Withdraw</Text>
      <Text style={styles.subtitle}>
        Send funds from your virtual account to an external address (or
        internal address for instant transfer).
      </Text>

      <Text style={styles.label}>Network</Text>
      <ChainChips value={chain} onChange={setChain} />

      <TextField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.01"
        keyboardType="decimal-pad"
      />
      <TextField
        label="Destination address"
        value={destinationAddress}
        onChangeText={setDestinationAddress}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PrimaryButton
        title="Submit withdrawal"
        onPress={() => void submit()}
        loading={loading}
        disabled={!amount.trim() || !destinationAddress.trim()}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <Card style={styles.card}>
          <Text style={styles.mono}>{result}</Text>
        </Card>
      ) : null}
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
  subtitle: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
  },
  card: {
    marginTop: theme.spacing.lg,
  },
  mono: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
});
