import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components";
import { useAuth } from "../hooks/useAuth";
import * as api from "../services/tatumBankApi";
import type { Chain, WalletSummary } from "../types/api";
import type { MainTabParamList } from "../types/navigation";
import { theme } from "../theme";
import { getErrorMessage } from "../utils/errors";

const CHAIN_ORDER: Chain[] = ["ETH", "BTC", "MATIC"];

function formatBalance(raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") {
    return "—";
  }
  const n = Number(raw);
  if (Number.isFinite(n)) {
    const s = n.toString();
    if (s.includes("e") || s.includes("E")) {
      return raw;
    }
    return raw;
  }
  return raw;
}

function balanceForChain(
  wallets: WalletSummary[],
  chain: Chain
): string {
  const row = wallets.find((w) => w.chain === chain);
  return formatBalance(row?.va_balance);
}

type TabNav = BottomTabNavigationProp<MainTabParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<TabNav>();
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const rows = useMemo(
    () =>
      CHAIN_ORDER.map((chain) => ({
        chain,
        label:
          chain === "ETH"
            ? "Ethereum"
            : chain === "BTC"
              ? "Bitcoin"
              : "Polygon",
        balance: balanceForChain(wallets, chain),
      })),
    [wallets]
  );

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Portfolio</Text>
            <Text style={styles.title}>Overview</Text>
            {email ? (
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => void logout()}
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.logoutPressed,
            ]}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.bannerError}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>Balances</Text>
          <Text style={styles.cardHint}>
            Pull to refresh · From virtual accounts
          </Text>

          {loading && !refreshing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading balances…</Text>
            </View>
          ) : (
            rows.map((row) => (
              <View key={row.chain} style={styles.balanceRow}>
                <View style={styles.assetLeft}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetSymbol}>{row.chain}</Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{row.label}</Text>
                    <Text style={styles.assetTicker}>{row.chain}</Text>
                  </View>
                </View>
                <Text style={styles.assetAmount}>{row.balance}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick actions</Text>
          <Text style={styles.cardHint}>
            Move funds, buy crypto, or review history
          </Text>

          <View style={styles.actionsGrid}>
            <ActionTile
              icon="arrow-down-circle"
              label="Deposit"
              onPress={() => navigation.navigate("Deposit")}
            />
            <ActionTile
              icon="arrow-up-circle"
              label="Withdraw"
              onPress={() => navigation.navigate("Withdraw")}
            />
            <ActionTile
              icon="card"
              label="Buy crypto"
              onPress={() => navigation.navigate("Buy")}
            />
            <ActionTile
              icon="list"
              label="Transactions"
              onPress={() => navigation.navigate("Transactions")}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        pressed && styles.actionTilePressed,
      ]}
    >
      <Ionicons name={icon} size={26} color={theme.colors.accent} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  kicker: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  email: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    maxWidth: "78%",
  },
  logoutBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  logoutPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  bannerError: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(248,113,113,0.12)",
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.lg,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardHint: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  assetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  assetSymbol: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  assetName: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  assetTicker: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  assetAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    fontVariant: ["tabular-nums"],
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionTile: {
    width: "48%",
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  actionTilePressed: {
    opacity: 0.88,
  },
  actionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
});
