import React from "react";
import type { ViewStyle } from "react-native";
import { Button } from "./Button";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
};

/** @deprecated Prefer `<Button />` — kept for existing screens. */
export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  variant = "primary",
}: Props) {
  return (
    <Button
      title={title}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      variant={variant === "outline" ? "outline" : "primary"}
      size="md"
      style={style}
    />
  );
}
