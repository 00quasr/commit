export const colors = {
  bg: "#050505",
  fg: "#ffffff",
} as const;

export type ColorToken = keyof typeof colors;
