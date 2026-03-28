import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../theme";

export type LoaderSize = "small" | "large";

export type LoaderProps = {
  /** Full-screen dimmed overlay (e.g. blocking submit) */
  overlay?: boolean;
  visible?: boolean;
  message?: string;
  size?: LoaderSize;
  color?: string;
  /** When `overlay` is true, tap outside does nothing by default */
  testID?: string;
};

export function Loader({
  overlay = false,
  visible = true,
  message,
  size = "large",
  color = theme.colors.accent,
  testID,
}: LoaderProps) {
  if (!visible) {
    return null;
  }

  const indicator = (
    <View style={styles.center} testID={testID}>
      <ActivityIndicator
        size={size}
        color={color}
        accessibilityLabel={message ?? "Loading"}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>{indicator}</View>
        </View>
      </Modal>
    );
  }

  return indicator;
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
    maxWidth: 260,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  overlayCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
});
