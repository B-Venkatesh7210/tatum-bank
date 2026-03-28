import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

function formatWithdrawSuccess(res: Record<string, unknown>): string {
  const mode = res.mode;
  if (mode === "internal_va_transfer") {
    const ref = res.reference;
    return [
      "Internal transfer completed.",
      typeof ref === "string" ? `Reference: ${ref}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (mode === "external_blockchain") {
    const lines: string[] = ["External withdrawal submitted."];
    const txId = res.txId;
    const wid = res.tatumWithdrawalId;
    const kms = res.kmsPending;
    if (typeof txId === "string") {
      lines.push(`Tx: ${txId}`);
    }
    if (typeof wid === "string") {
      lines.push(`Withdrawal ID: ${wid}`);
    }
    if (kms && typeof kms === "object") {
      lines.push("Status: awaiting KMS signature / broadcast");
    }
    return lines.join("\n");
  }
  return JSON.stringify(res, null, 2);
}

export function WithdrawScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    clearFeedback();
    const amt = amount.trim();
    const dest = destinationAddress.trim();
    if (!amt || !dest) {
      setError("Amount and destination address are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestWithdrawal({
        chain,
        amount: amt,
        destinationAddress: dest,
      });
      setSuccess(formatWithdrawSuccess(res as Record<string, unknown>));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.kicker}>Send funds</Text>
      <Text style={styles.title}>Withdraw</Text>
      <Text style={styles.subtitle}>
        Withdraw from your virtual account to an external address. Internal
        transfers to another custody address settle via the ledger.
      </Text>

      <View style={styles.cardWrap}>
        <View style={styles.accentBar} />
        <Text style={styles.sectionLabel}>Network</Text>
        <ChainChips
          value={chain}
          onChange={(c) => {
            setChain(c);
            clearFeedback();
          }}
        />

        <TextField
          label="Amount"
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            clearFeedback();
          }}
          placeholder="0.01"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <TextField
          label="Destination address"
          value={destinationAddress}
          onChangeText={(t) => {
            setDestinationAddress(t);
            clearFeedback();
          }}
          placeholder="0x… or bc1…"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <PrimaryButton
          title="Submit withdrawal"
          onPress={() => void submit()}
          loading={loading}
          disabled={!amount.trim() || !destinationAddress.trim()}
        />
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <View style={styles.msgRow}>
            <Ionicons
              name="close-circle"
              size={22}
              color={theme.colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      ) : null}

      {success ? (
        <Card style={styles.successCard}>
          <View style={styles.msgRow}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={theme.colors.success}
            />
            <Text style={styles.successText}>{success}</Text>
          </View>
        </Card>
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
  subtitle: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  cardWrap: {
    position: "relative",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    paddingLeft: theme.spacing.lg + 4,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.accent,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  errorCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  successCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    borderColor: "rgba(52, 211, 153, 0.35)",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  successText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: undefined,
    }),
  },
});
