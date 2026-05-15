export const colors = {
  bg: "#050505",
  fg: "#ffffff",
} as const;

export type ColorToken = keyof typeof colors;

export const habitColors = [
  "#5590D9", // blue
  "#52B788", // green
  "#E05252", // red
  "#E09940", // amber
  "#9B6EDE", // purple
  "#40B4C4", // teal
  "#D46BAA", // pink
  "#C4D454", // yellow-green
] as const;

export type HabitColor = (typeof habitColors)[number];
