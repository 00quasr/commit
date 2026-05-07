import { colors, fonts } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface TodoRowProps {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  isDone: boolean;
  onToggle: () => void;
}

export function TodoRow({ text, difficulty, isDone, onToggle }: TodoRowProps) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
        {isDone && <Text style={styles.checkText}>✓</Text>}
      </View>
      <View style={styles.body}>
        <Text style={[styles.text, isDone && styles.textDone]} numberOfLines={2}>
          {text}
        </Text>
        <Text style={styles.meta}>{difficulty}</Text>
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
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: colors.fg,
    borderColor: colors.fg,
  },
  checkText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  text: {
    color: colors.fg,
    fontSize: 17,
    fontFamily: fonts.sans,
  },
  textDone: {
    color: "#666",
    textDecorationLine: "line-through",
  },
  meta: {
    color: "#444",
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
