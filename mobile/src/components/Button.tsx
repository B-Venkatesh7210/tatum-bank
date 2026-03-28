import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { theme } from "../theme";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const sizeStyles: Record<
  ButtonSize,
  { padV: number; padH: number; minH: number; font: number }
> = {
  sm: { padV: 10, padH: 14, minH: 40, font: theme.fontSize.sm },
  md: { padV: 14, padH: 20, minH: 52, font: theme.fontSize.md },
  lg: { padV: 16, padH: 24, minH: 56, font: theme.fontSize.md },
};

export function Button({
  onPress,
  title,
  children,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  fullWidth,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;
  const label = title ?? (typeof children === "string" ? children : null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title ?? undefined}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: s.padV,
          paddingHorizontal: s.padH,
          minHeight: s.minH,
        },
        fullWidth && styles.fullWidth,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        isDisabled && styles.disabled,
        pressed &&
          !isDisabled &&
          (variant === "primary"
            ? styles.pressedPrimary
            : variant === "outline"
              ? styles.pressedOutline
              : styles.pressedGhost),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost"
              ? theme.colors.accent
              : "#FFFFFF"
          }
        />
      ) : children && typeof children !== "string" ? (
        children
      ) : (
        <Text
          style={[
            styles.label,
            { fontSize: s.font },
            variant === "outline" && styles.labelOutline,
            variant === "ghost" && styles.labelGhost,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  fullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
  primary: {
    backgroundColor: theme.colors.accent,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  pressedPrimary: {
    backgroundColor: theme.colors.accentPressed,
  },
  pressedOutline: {
    backgroundColor: theme.colors.accentMuted,
  },
  pressedGhost: {
    opacity: 0.75,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  labelOutline: {
    color: theme.colors.accent,
  },
  labelGhost: {
    color: theme.colors.accent,
  },
});
