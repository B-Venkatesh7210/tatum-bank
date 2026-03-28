import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components";
import type { TransactionItem } from "../types/api";
import * as api from "../services/tatumBankApi";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

function formatTypeLabel(raw: string): string {
  const map: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdraw",
    internal_transfer: "Internal transfer",
    fee: "Fee",
  };
  return map[raw] ?? raw.replace(/_/g, " ");
}

function typeIcon(
  type: string
): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case "deposit":
      return { name: "arrow-down-circle", color: theme.colors.success };
    case "withdrawal":
      return { name: "arrow-up-circle", color: theme.colors.accent };
    case "internal_transfer":
      return { name: "swap-horizontal", color: "#60A5FA" };
    case "fee":
      return { name: "receipt-outline", color: theme.colors.textMuted };
    default:
      return { name: "ellipse-outline", color: theme.colors.textMuted };
  }
}

function statusMeta(
  status: string
): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (status) {
    case "completed":
      return { name: "checkmark-circle", color: theme.colors.success };
    case "confirming":
    case "pending":
      return { name: "time-outline", color: "#FBBF24" };
    case "failed":
    case "cancelled":
      return { name: "close-circle", color: theme.colors.error };
    default:
      return { name: "ellipse-outline", color: theme.colors.textMuted };
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function TransactionRow({ item }: { item: TransactionItem }) {
  const tIcon = typeIcon(item.type);
  const sMeta = statusMeta(item.status);

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { borderColor: tIcon.color }]}>
        <Ionicons name={tIcon.name} size={22} color={tIcon.color} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.rowTopLeft}>
            <Text style={styles.typeText}>{formatTypeLabel(item.type)}</Text>
            <Text style={styles.chainText}>{item.chain}</Text>
          </View>
          <Text style={styles.amount} numberOfLines={1}>
            {item.amount}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.statusPill}>
            <Ionicons name={sMeta.name} size={14} color={sMeta.color} />
            <Text style={[styles.statusText, { color: sMeta.color }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.kicker}>Activity</Text>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          Deposits, withdrawals, and transfers across your accounts.
        </Text>
      </View>
    ),
    []
  );

  const empty = useMemo(
    () => (
      <View style={styles.empty}>
        <Ionicons
          name="file-tray-outline"
          size={48}
          color={theme.colors.textMuted}
        />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySub}>
          When you deposit, withdraw, or transfer, they will show up here.
        </Text>
      </View>
    ),
    []
  );

  return (
    <ScreenContainer scroll={false}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons
            name="warning-outline"
            size={20}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingLabel}>Loading transactions…</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!loading ? empty : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => <TransactionRow item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
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
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  loadingWrap: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  loadingLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  rowTopLeft: {
    flex: 1,
    minWidth: 0,
  },
  typeText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  chainText: {
    marginTop: 2,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  amount: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
    fontVariant: ["tabular-nums"],
    maxWidth: "42%",
    textAlign: "right",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dateText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    flexShrink: 1,
    textAlign: "right",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: 44 + theme.spacing.md,
  },
  empty: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
