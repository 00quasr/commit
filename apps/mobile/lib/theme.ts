import { colors } from "@commit/ui-tokens";

// Local semantic tokens for the mobile dark theme. Mirrors the structure
// that's planned for @commit/ui-tokens.semantic — kept inlined here so the
// mobile polish components don't depend on package-level exports that may
// land separately. When @commit/ui-tokens.semantic stabilizes, swap this
// import in each consuming file.
export const theme = {
  bg: colors.bg,
  text: {
    primary: colors.fg,
    secondary: "rgba(255,255,255,0.72)",
    tertiary: "rgba(255,255,255,0.48)",
    muted: "rgba(255,255,255,0.32)",
  },
  divide: "rgba(255,255,255,0.08)",
  borderHairline: "rgba(255,255,255,0.06)",
  blockElevated: "rgba(255,255,255,0.04)",
  blockGlass: "rgba(255,255,255,0.06)",
} as const;
