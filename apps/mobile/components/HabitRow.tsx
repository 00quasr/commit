import { fonts, semantic } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface HabitRowProps {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  cycleDays: number;
  doneToday?: boolean;
  onPress: () => void;
}

function cycleLabel(cycleDays: number): string {
  if (cycleDays === 1) return "daily";
  if (cycleDays === 2) return "every 2 days";
  if (cycleDays === 7) return "weekly";
  return `every ${cycleDays} days`;
}

export function HabitRow({
  text,
  difficulty,
  cycleDays,
  doneToday = false,
  onPress,
}: HabitRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={[styles.checkbox, doneToday && styles.checkboxDone]}>
        {doneToday && <Text style={styles.check}>✓</Text>}
      </View>
      <View style={styles.body}>
        <Text style={[styles.text, doneToday && styles.textDone]} numberOfLines={2}>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: semantic.bg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: semantic.text.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: semantic.text.primary,
    borderColor: semantic.text.primary,
  },
  check: {
    color: semantic.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  body: { flex: 1 },
  text: {
    color: semantic.text.primary,
    fontSize: 17,
    fontFamily: fonts.sans,
    lineHeight: 22,
  },
  textDone: {
    color: semantic.text.tertiary,
    textDecorationLine: "line-through",
  },
  meta: {
    color: semantic.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
