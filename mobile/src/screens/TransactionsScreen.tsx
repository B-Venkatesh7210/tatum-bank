import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, ScreenContainer } from "../components";
import type { TransactionItem } from "../types/api";
import * as api from "../services/tatumBankApi";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

export function TransactionsScreen() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { transactions } = await api.fetchTransactions();
      setItems(transactions);
    } catch (e) {
      setError(getErrorMessage(e));
      setItems([]);
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
      <Text style={styles.title}>Transactions</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !refreshing ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>No transactions yet.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.chain}>{item.chain}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.amount}>{item.amount}</Text>
            <Text style={styles.hash} numberOfLines={1}>
              {item.txHash}
            </Text>
            <Text style={styles.date}>{item.createdAt}</Text>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "700",
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chain: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  status: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textTransform: "uppercase",
  },
  type: {
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
  },
  amount: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    marginTop: theme.spacing.xs,
  },
  hash: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.sm,
  },
  date: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
});
