import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ChainChips,
  Card,
  PrimaryButton,
  ScreenContainer,
} from "../components";
import type { Chain } from "../types/api";
import * as api from "../services/tatumBankApi";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

export function DepositScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureWallet() {
    setError(null);
    setResult(null);
    setLoadingWallet(true);
    try {
      const res = await api.provisionWallet(chain);
      setResult(
        res.wallet
          ? `Wallet ready for ${res.chain}. Addresses: ${res.wallet.addresses.length}`
          : `Requested ${res.chain}`
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingWallet(false);
    }
  }

  async function newDepositAddress() {
    setError(null);
    setResult(null);
    setLoadingDeposit(true);
    try {
      const res = await api.createDeposit(chain);
      setResult(`New deposit address (${res.chain}): ${res.address}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingDeposit(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Deposit</Text>
      <Text style={styles.subtitle}>
        Create a ledger wallet for a chain, then generate deposit addresses.
      </Text>

      <Text style={styles.label}>Network</Text>
      <ChainChips value={chain} onChange={setChain} />

      <PrimaryButton
        title="Create / sync wallet"
        onPress={() => void ensureWallet()}
        loading={loadingWallet}
        disabled={loadingDeposit}
      />

      <PrimaryButton
        title="New deposit address"
        onPress={() => void newDepositAddress()}
        loading={loadingDeposit}
        disabled={loadingWallet}
        style={styles.gap}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <Card style={styles.card}>
          <Text style={styles.result}>{result}</Text>
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
  gap: {
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
  },
  card: {
    marginTop: theme.spacing.lg,
  },
  result: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
});
