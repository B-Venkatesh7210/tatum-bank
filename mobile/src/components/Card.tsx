import React from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { theme } from "../theme";

export type CardVariant = "default" | "elevated";

export type CardProps = ViewProps & {
  /** Subtle lift + shadow */
  variant?: CardVariant;
  /** Thin vertical accent bar on the left (fintech panel look) */
  accentBar?: boolean;
  /** Override inner padding */
  padding?: keyof typeof theme.spacing | number;
};

export function Card({
  style,
  children,
  variant = "default",
  accentBar = false,
  padding = "md",
  ...rest
}: CardProps) {
  const pad =
    typeof padding === "number"
      ? padding
      : theme.spacing[padding];

  return (
    <View
      style={[
        styles.card,
        variant === "elevated" && styles.elevated,
        { padding: pad, paddingLeft: accentBar ? pad + 6 : pad },
        style,
      ]}
      {...rest}
    >
      {accentBar ? <View style={styles.accentStrip} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    position: "relative",
  },
  elevated: {
    backgroundColor: theme.colors.surfaceElevated,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  accentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.lg,
  },
});
