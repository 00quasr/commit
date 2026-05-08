import { colors, fonts } from "@commit/ui-tokens";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropTimer, useTimerRemaining } from "@/lib/dropTimer";

export default function Countdown() {
  const remainingMs = useTimerRemaining();
  const cancel = useDropTimer((s) => s.cancel);

  // Window expired → close the modal stack. Single dismiss(), no separate
  // habitId-watch effect, to avoid double-fire POP_TO_TOP warnings.
  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      cancel();
      router.dismissAll();
    }
  }, [remainingMs, cancel]);

  const seconds = remainingMs === null ? 0 : Math.ceil(remainingMs / 1000);

  const onContinue = () => {
    router.push("/drop/camera");
  };

  const onCancel = () => {
    cancel();
    router.dismissAll();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Text style={styles.label}>DROP IT</Text>
        <Text style={styles.timer}>{seconds}</Text>
        <Text style={styles.hint}>seconds left to capture proof</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.continue, pressed && { opacity: 0.7 }]}
          onPress={onContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: {
    color: "#666",
    fontSize: 13,
    fontFamily: fonts.mono,
    letterSpacing: 2,
    marginBottom: 16,
  },
  timer: {
    color: colors.fg,
    fontSize: 144,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  hint: {
    color: "#666",
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 16,
  },
  buttons: { gap: 8, paddingBottom: 24 },
  continue: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
  },
  continueText: { color: colors.bg, fontSize: 17, fontFamily: fonts.sans, fontWeight: "600" },
  cancel: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  cancelText: { color: "#888", fontSize: 16, fontFamily: fonts.sans },
});
