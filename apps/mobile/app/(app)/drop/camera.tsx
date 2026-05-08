import { colors, fonts } from "@commit/ui-tokens";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropTimer, useTimerRemaining } from "@/lib/dropTimer";

export default function CameraScreen() {
  const photoUri = useDropTimer((s) => s.photoUri);
  const setPhoto = useDropTimer((s) => s.setPhoto);
  const cancel = useDropTimer((s) => s.cancel);
  const remainingMs = useTimerRemaining();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Window expired — abort. (No separate `habitId === null` effect: cancel()
  // sets habitId null and we don't want a second dismiss() to fire after
  // we've already dismissed — that produces a POP_TO_TOP warning.)
  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      cancel();
      router.dismiss();
    }
  }, [remainingMs, cancel]);

  // Auto-request permission on mount if undetermined.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const onCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setPhoto(photo.uri);
      }
    } finally {
      setCapturing(false);
    }
  };

  const onUse = () => {
    router.push("/drop/compose");
  };

  const onRetake = () => {
    setPhoto(null);
  };

  const onCancel = () => {
    cancel();
    router.dismiss();
  };

  const seconds = remainingMs === null ? 0 : Math.ceil(remainingMs / 1000);

  // Permission states.
  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={["top", "bottom"]}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          The drop is photo proof. Allow camera access to keep going.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.7 }]}
          onPress={() => {
            if (permission.canAskAgain) {
              void requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
        >
          <Text style={styles.permButtonText}>
            {permission.canAskAgain ? "Allow camera" : "Open Settings"}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ marginTop: 16 }}>
          <Text style={styles.cancelInline}>Cancel drop</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Preview after capture.
  if (photoUri) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.previewWrap} edges={["top", "bottom"]}>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{seconds}s</Text>
          </View>
          <View style={styles.previewImageWrap}>
            <Image
              source={{ uri: photoUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          </View>
          <View style={styles.previewButtons}>
            <Pressable style={styles.retake} onPress={onRetake}>
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
            <Pressable style={styles.use} onPress={onUse}>
              <Text style={styles.useText}>Use photo</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Live camera.
  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      <SafeAreaView style={styles.cameraOverlay} edges={["top", "bottom"]}>
        <View style={styles.topRow}>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text style={styles.cancelTop}>Cancel</Text>
          </Pressable>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{seconds}s</Text>
          </View>
        </View>
        <View style={styles.captureWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.captureBtn,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
            onPress={() => void onCapture()}
            disabled={capturing}
          >
            <View style={styles.captureInner} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  cameraOverlay: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  cancelTop: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans },
  timerPill: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: colors.fg,
    fontSize: 14,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  captureWrap: { alignItems: "center", paddingBottom: 32 },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.fg },
  // Permission state
  permTitle: { color: colors.fg, fontSize: 22, fontFamily: fonts.sans, fontWeight: "600" },
  permBody: {
    color: "#888",
    fontSize: 15,
    fontFamily: fonts.sans,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: colors.fg,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permButtonText: { color: colors.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
  cancelInline: { color: "#666", fontSize: 14, fontFamily: fonts.sans },
  // Preview
  previewWrap: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20 },
  previewImageWrap: { flex: 1, marginVertical: 16, borderRadius: 16, overflow: "hidden" },
  previewButtons: { flexDirection: "row", gap: 8, paddingBottom: 8 },
  retake: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  retakeText: { color: "#888", fontSize: 16, fontFamily: fonts.sans },
  use: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
  },
  useText: { color: colors.bg, fontSize: 17, fontFamily: fonts.sans, fontWeight: "700" },
});
