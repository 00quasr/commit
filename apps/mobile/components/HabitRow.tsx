import { colors, fonts } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface HabitRowProps {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  cycleDays: number;
  onPress: () => void;
}

function cycleLabel(cycleDays: number): string {
  if (cycleDays === 1) return "daily";
  if (cycleDays === 2) return "every 2 days";
  if (cycleDays === 7) return "weekly";
  return `every ${cycleDays} days`;
}

export function HabitRow({ text, difficulty, cycleDays, onPress }: HabitRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.checkbox} />
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
        <Text style={styles.meta}>
          {difficulty} · {cycleLabel(cycleDays)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#444",
  },
  body: {
    flex: 1,
  },
  text: {
    color: colors.fg,
    fontSize: 17,
    fontFamily: fonts.sans,
  },
  meta: {
    color: "#444",
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
