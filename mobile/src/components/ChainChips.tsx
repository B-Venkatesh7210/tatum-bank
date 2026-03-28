import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Chain } from "../types/api";
import { theme } from "../theme";

const CHAINS: Chain[] = ["ETH", "MATIC", "BTC"];

type Props = {
  value: Chain;
  onChange: (c: Chain) => void;
  disabled?: boolean;
};

export function ChainChips({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      {CHAINS.map((c) => {
        const active = c === value;
        return (
          <Pressable
            key={c}
            disabled={disabled}
            onPress={() => onChange(c)}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: theme.colors.textMuted,
    fontWeight: "600",
    fontSize: theme.fontSize.sm,
  },
  chipTextActive: {
    color: theme.colors.accent,
  },
});
