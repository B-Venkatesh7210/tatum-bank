export const theme = {
  colors: {
    background: "#0D0D0F",
    surface: "#16161A",
    surfaceElevated: "#1C1C22",
    border: "#2A2A32",
    text: "#F4F4F5",
    textMuted: "#9CA3AF",
    accent: "#DC2626",
    accentPressed: "#B91C1C",
    error: "#F87171",
    success: "#34D399",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
  },
} as const;

export type Theme = typeof theme;
