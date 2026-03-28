import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { theme } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  variant = "primary",
}: Props) {
  const isOutline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.filled,
        (disabled || loading) && styles.disabled,
        pressed &&
          !disabled &&
          !loading &&
          (isOutline ? styles.pressedOutline : styles.pressed),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.colors.accent : "#fff"} />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  filled: {
    backgroundColor: theme.colors.accent,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    backgroundColor: theme.colors.accentPressed,
  },
  pressedOutline: {
    opacity: 0.85,
  },
  label: {
    color: "#FFFFFF",
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
  labelOutline: {
    color: theme.colors.accent,
  },
});
