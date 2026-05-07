export const fonts = {
  sans: "Geist",
  mono: "Geist Mono",
} as const;

export type FontToken = keyof typeof fonts;
