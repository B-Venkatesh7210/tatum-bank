import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, PrimaryButton, ScreenContainer } from "../components";
import { useAuth } from "../hooks/useAuth";
import * as api from "../services/tatumBankApi";
import type { WalletSummary } from "../types/api";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

export function DashboardScreen() {
  const { email, logout } = useAuth();
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { wallets: w } = await api.fetchWallets();
      setWallets(w);
    } catch (e) {
      setError(getErrorMessage(e));
      setWallets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>
        <PrimaryButton
          title="Logout"
          onPress={() => void logout()}
          style={styles.logout}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !refreshing ? (
        <Text style={styles.muted}>Loading wallets…</Text>
      ) : null}

      <FlatList
        data={wallets}
        keyExtractor={(item) => item.wallet_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>
              No wallets yet. Open the Deposit tab to create a wallet for a
              chain.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.chain}>{item.chain}</Text>
            <Text style={styles.balance}>
              Balance: {item.va_balance ?? "—"}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              Addresses: {item.addresses.length}
            </Text>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  logout: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "700",
    color: theme.colors.text,
  },
  email: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
  },
  muted: {
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  chain: {
    color: theme.colors.accent,
    fontWeight: "700",
    fontSize: theme.fontSize.lg,
  },
  balance: {
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.md,
  },
  meta: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
  },
});
