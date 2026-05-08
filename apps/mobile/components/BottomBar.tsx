import { fonts, semantic } from "@commit/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface BottomBarProps {
  onAdd: () => void;
}

/**
 * Floating bottom-center action bar — replaces the old corner FAB.
 * Two slots:
 *   - "+"   adds a new habit (opens the bottom sheet)
 *   - "🎤"  placeholder for the voice-only quick-drop coming in Phase 4
 *           (rendered dimmed with no handler in V1)
 */
export function BottomBar({ onAdd }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
          onPress={onAdd}
          hitSlop={8}
        >
          <Text style={styles.plusIcon}>+</Text>
        </Pressable>
        <View style={styles.divider} />
        <View style={[styles.btn, styles.btnDisabled]}>
          <Text style={styles.micIcon}>🎤</Text>
        </View>
      </View>
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
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: semantic.blockGlass,
    borderColor: semantic.borderHairline,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.32 },
  plusIcon: {
    color: semantic.text.primary,
    fontSize: 26,
    lineHeight: 28,
    fontFamily: fonts.sans,
    fontWeight: "300",
  },
  micIcon: { fontSize: 18 },
  divider: { width: 1, height: 24, backgroundColor: semantic.divide, marginHorizontal: 4 },
});
