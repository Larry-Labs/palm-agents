import { Platform } from "react-native";

export const Colors = {
  light: {
    isDark: false,
    text: "#202123",
    background: "#FFFFFF",
    backgroundElement: "#F5F5F5",
    backgroundSelected: "#E8E9EB",
    textSecondary: "#6B6D73",
    textSecondaryStrong: "#50535A",
    border: "#DEDFE2",
    sidebar: "#F7F7F8",
    surface: "#FFFFFF",
    primary: "#202123",
    onPrimary: "#FFFFFF",
    link: "#0969DA",
    subtle: "rgba(0, 0, 0, 0.04)",
    overlay: "rgba(0, 0, 0, 0.28)",
    powerTrack: "#D7D9DD",
    powerBlue: "#3E96FF",
    powerViolet: "#7868FF",
    powerMagenta: "#C06DFF",
    agentGreen: "#6BBF59",
    agentViolet: "#9B84D6",
    agentCyan: "#48B9D9",
    agentTeal: "#4FB4AE",
  },
  dark: {
    isDark: true,
    text: "#F2F2F2",
    background: "#191919",
    backgroundElement: "#2A2A2A",
    backgroundSelected: "#383838",
    textSecondary: "#9A9A9A",
    textSecondaryStrong: "#A6A6A6",
    border: "#3A3A3A",
    sidebar: "#171717",
    surface: "#232323",
    primary: "#F2F2F2",
    onPrimary: "#191919",
    link: "#7CC7FF",
    subtle: "rgba(255, 255, 255, 0.06)",
    overlay: "rgba(0, 0, 0, 0.42)",
    powerTrack: "#454545",
    powerBlue: "#3E96FF",
    powerViolet: "#7868FF",
    powerMagenta: "#C06DFF",
    agentGreen: "#6BBF59",
    agentViolet: "#9B84D6",
    agentCyan: "#48B9D9",
    agentTeal: "#4FB4AE",
  },
};

export type AppTheme = typeof Colors.light;
export type ThemeColor = Exclude<keyof AppTheme, "isDark">;

export const Fonts = Platform.select({
  default: {
    sans: "System",
    sansBold: "System",
    sansMedium: "System",
    sansSemiBold: "System",
    serif: "serif",
    rounded: "System",
    mono: "monospace",
    monoMedium: "monospace",
  },
  android: {
    sans: "sans-serif",
    sansBold: "sans-serif",
    sansMedium: "sans-serif-medium",
    sansSemiBold: "sans-serif-medium",
    serif: "serif",
    rounded: "sans-serif",
    mono: "monospace",
    monoMedium: "monospace",
  },
  ios: {
    sans: "System",
    sansBold: "System",
    sansMedium: "System",
    sansSemiBold: "System",
    serif: "serif",
    rounded: "System",
    mono: "Menlo",
    monoMedium: "Menlo",
  },
  web: {
    sans: "var(--font-display)",
    sansBold: "var(--font-display-bold)",
    sansMedium: "var(--font-display-medium)",
    sansSemiBold: "var(--font-display-semibold)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
    monoMedium: "var(--font-mono-medium)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
