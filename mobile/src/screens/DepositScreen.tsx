import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
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

const QR_SIZE = 220;

export function DepositScreen() {
  const [chain, setChain] = useState<Chain>("ETH");
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAddress(null);
    setError(null);
    setCopied(false);
  }, [chain]);

  const fetchOrCreateAddress = useCallback(async () => {
    setError(null);
    setCopied(false);
    setLoading(true);
    try {
      const { wallets } = await api.fetchWallets();
      const row = wallets.find((w) => w.chain === chain);
      if (row?.addresses?.length) {
        setAddress(row.addresses[0]);
        return;
      }
      await api.provisionWallet(chain);
      const dep = await api.createDeposit(chain);
      setAddress(dep.address);
    } catch (e) {
      setError(getErrorMessage(e));
      setAddress(null);
    } finally {
      setLoading(false);
    }
  }, [chain]);

  const fetchNewAddress = useCallback(async () => {
    setError(null);
    setCopied(false);
    setLoadingNew(true);
    try {
      const dep = await api.createDeposit(chain);
      setAddress(dep.address);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingNew(false);
    }
  }, [chain]);

  async function copyAddress() {
    if (!address) {
      return;
    }
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Deposit</Text>
      <Text style={styles.subtitle}>
        Choose a network, load your deposit address, then send crypto to it.
        Always verify the address before transferring.
      </Text>

      <Text style={styles.label}>Network</Text>
      <ChainChips value={chain} onChange={setChain} />

      <PrimaryButton
        title={loading ? "Loading…" : "Get deposit address"}
        onPress={() => void fetchOrCreateAddress()}
        loading={loading}
        disabled={loadingNew}
      />

      <PrimaryButton
        title="New deposit address"
        onPress={() => void fetchNewAddress()}
        loading={loadingNew}
        disabled={loading}
        variant="outline"
        style={styles.secondaryBtn}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {address ? (
        <Card style={styles.resultCard}>
          <Text style={styles.resultLabel}>Deposit address</Text>
          <Text style={styles.chainBadge}>{chain}</Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={address}
              size={QR_SIZE}
              backgroundColor={theme.colors.surface}
              color={theme.colors.text}
              quietZone={8}
            />
          </View>

          <View style={styles.addressRow}>
            <Text style={styles.address} selectable>
              {address}
            </Text>
          </View>

          <Pressable
            onPress={() => void copyAddress()}
            style={({ pressed }) => [
              styles.copyBtn,
              pressed && styles.copyBtnPressed,
            ]}
          >
            {copied ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={theme.colors.success}
                />
                <Text style={styles.copyLabelCopied}>Copied</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="copy-outline"
                  size={22}
                  color={theme.colors.accent}
                />
                <Text style={styles.copyLabel}>Copy address</Text>
              </>
            )}
          </Pressable>
        </Card>
      ) : !loading && !error ? (
        <Text style={styles.hint}>
          Tap &quot;Get deposit address&quot; to fetch from your account (or
          create a wallet + first address).
        </Text>
      ) : null}

      {loading && !address ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
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
    lineHeight: 20,
  },
  label: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  secondaryBtn: {
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  hint: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  resultCard: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  resultLabel: {
    alignSelf: "flex-start",
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  chainBadge: {
    alignSelf: "flex-start",
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  qrWrap: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  addressRow: {
    alignSelf: "stretch",
    marginBottom: theme.spacing.md,
  },
  address: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  copyBtnPressed: {
    opacity: 0.85,
  },
  copyLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  copyLabelCopied: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.success,
  },
  inlineLoading: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
  },
});
