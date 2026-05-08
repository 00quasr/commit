// Semantic tokens for the dark-only theme. Mirrors the structure used by
// the web app's CSS variables in apps/web/app/globals.css. When a light
// theme is added later, each leaf becomes a `{ dark, light }` pair —
// consumers don't need to change.
export const semantic = {
  bg: "#050505",
  text: {
    primary: "#ffffff",
    secondary: "rgba(255,255,255,0.72)",
    tertiary: "rgba(255,255,255,0.48)",
    muted: "rgba(255,255,255,0.32)",
  },
  divide: "rgba(255,255,255,0.08)",
  borderHairline: "rgba(255,255,255,0.06)",
  blockElevated: "rgba(255,255,255,0.04)",
  blockGlass: "rgba(255,255,255,0.06)",
} as const;

export type SemanticToken =
  | "bg"
  | "text.primary"
  | "text.secondary"
  | "text.tertiary"
  | "text.muted"
  | "divide"
  | "borderHairline"
  | "blockElevated"
  | "blockGlass";
