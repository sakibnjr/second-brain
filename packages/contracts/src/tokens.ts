/**
 * Shared Design Tokens for Personal Planner.
 * Used across React/Tailwind on Desktop and Jetpack Compose on Android.
 */
export const DesignTokens = {
  colors: {
    light: {
      background: "#FAFAFA",
      surface: "#FFFFFF",
      surfaceHover: "#F4F4F5",
      border: "#E4E4E7",
      textPrimary: "#18181B",
      textSecondary: "#71717A",
      textMuted: "#A1A1AA",
      primary: "#2563EB", // Indigo / Blue 600
      primaryHover: "#1D4ED8",
      primaryForeground: "#FFFFFF",
      secondary: "#F4F4F5",
      secondaryForeground: "#18181B",
      accent: "#0D9488", // Teal 600
      danger: "#EF4444",
      warning: "#F59E0B",
      success: "#10B981",
    },
    dark: {
      background: "#09090B",
      surface: "#18181B",
      surfaceHover: "#27272A",
      border: "#27272A",
      textPrimary: "#FAFAFA",
      textSecondary: "#A1A1AA",
      textMuted: "#71717A",
      primary: "#3B82F6", // Blue 500
      primaryHover: "#60A5FA",
      primaryForeground: "#FFFFFF",
      secondary: "#27272A",
      secondaryForeground: "#FAFAFA",
      accent: "#14B8A6",
      danger: "#F87171",
      warning: "#FBBF24",
      success: "#34D399",
    },
    priority: {
      low: "#10B981",
      medium: "#F59E0B",
      high: "#EF4444",
    },
    status: {
      todo: "#64748B",
      in_progress: "#3B82F6",
      completed: "#10B981",
      paused: "#F59E0B",
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  typography: {
    fontFamilySans:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono:
      'JetBrains Mono, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
} as const;

export type DesignTheme = "light" | "dark" | "system";
