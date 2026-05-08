import { fonts } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

export interface BottomBarProps {
  onAdd: () => void;
}

/**
 * Floating bottom-center "+" button. Single-action V1 — voice-only quick
 * drop is Phase 4 and will get its own affordance somewhere else.
 */
export function BottomBar({ onAdd }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        onPress={onAdd}
        hitSlop={8}
      >
        <Text style={styles.plusIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.text.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  plusIcon: {
    color: theme.bg,
    fontSize: 28,
    lineHeight: 30,
    fontFamily: fonts.sans,
    fontWeight: "300",
  },
});
