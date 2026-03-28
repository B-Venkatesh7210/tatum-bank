export const theme = {
  colors: {
    background: "#0B0B0D",
    surface: "#141418",
    surfaceElevated: "#1A1A20",
    border: "#2A2A32",
    borderFocus: "rgba(178, 29, 37, 0.45)",
    text: "#F4F4F5",
    textMuted: "#9CA3AF",
    /** Primary brand — buttons, links, focus rings */
    accent: "#b21d25",
    accentPressed: "#8f171e",
    accentMuted: "rgba(178, 29, 37, 0.12)",
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
    full: 9999,
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
