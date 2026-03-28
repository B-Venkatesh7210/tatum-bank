import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorBanner({ message, onRetry, retryLabel = "Retry" }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="warning-outline" size={20} color={theme.colors.error} />
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  text: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  retry: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  retryPressed: {
    opacity: 0.75,
  },
  retryText: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
  },
});
