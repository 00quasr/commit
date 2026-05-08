import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
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
    backgroundColor: theme.bg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.text.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: theme.text.primary,
    borderColor: theme.text.primary,
  },
  check: {
    color: theme.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  body: { flex: 1 },
  text: {
    color: theme.text.primary,
    fontSize: 17,
    fontFamily: fonts.sans,
    lineHeight: 22,
  },
  textDone: {
    color: theme.text.tertiary,
    textDecorationLine: "line-through",
  },
  meta: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
