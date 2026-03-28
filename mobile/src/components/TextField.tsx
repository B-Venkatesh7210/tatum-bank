import React from "react";
import type { TextInputProps } from "react-native";
import { Input } from "./Input";

type Props = {
  label: string;
  error?: string;
} & TextInputProps;

/** Labeled input — same as `<Input label="…" />` with required label. */
export function TextField({ label, error, style, ...rest }: Props) {
  return <Input label={label} error={error} inputStyle={style} {...rest} />;
}
