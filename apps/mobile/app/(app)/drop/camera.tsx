import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@commit/ui-tokens";
import { CameraView, useCameraPermissions } from "expo-camera";
import { FlipType, manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropDraft } from "@/lib/dropDraft";
import { deleteLocalFile } from "@/lib/media";

type Facing = "back" | "front";
type FlashMode = "auto" | "on" | "off";

export default function CameraScreen() {
  const setPhoto = useDropDraft((s) => s.setPhoto);
  const cancel = useDropDraft((s) => s.cancel);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const capturingRef = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const [facing, setFacing] = useState<Facing>("back");
  const [flash, setFlash] = useState<FlashMode>("auto");
  const screenFlashOpacity = useSharedValue(0);
  const screenFlashStyle = useAnimatedStyle(() => ({ opacity: screenFlashOpacity.value }));

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const onCapture = async () => {
    if (!cameraRef.current || capturingRef.current) return;
    capturingRef.current = true;
    setCapturing(true);
    const useScreenFlash = facing === "front" && flash !== "off";
    try {
      if (useScreenFlash) {
        await new Promise<void>((resolve) => {
          screenFlashOpacity.value = withTiming(1, { duration: 100 }, () => {
            runOnJS(resolve)();
          });
        });
      }
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (useScreenFlash) {
        screenFlashOpacity.value = withTiming(0, { duration: 200 });
      }
      if (photo?.uri) {
        const { width: pw, height: ph } = photo;
        const targetRatio = 3 / 4;
        const photoRatio = pw / ph;
        let cropWidth = pw;
        let cropHeight = ph;
        if (photoRatio > targetRatio) {
          cropWidth = Math.round(ph * targetRatio);
        } else if (photoRatio < targetRatio) {
          cropHeight = Math.round(pw / targetRatio);
        }
        const originX = Math.round((pw - cropWidth) / 2);
        const originY = Math.round((ph - cropHeight) / 2);
        const actions: Parameters<typeof manipulateAsync>[1] = [
          { crop: { originX, originY, width: cropWidth, height: cropHeight } },
        ];
        if (facing === "front") actions.push({ flip: FlipType.Horizontal });
        const cropped = await manipulateAsync(photo.uri, actions, {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });
        // The full-res original capture is no longer needed once we have the
        // cropped copy the compose screen will upload (COM-139).
        deleteLocalFile(photo.uri);
        setPhoto(cropped.uri);
        router.push("/drop/compose");
      }
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  };

  const onCancel = () => {
    cancel();
    router.replace("/(tabs)");
  };
  const toggleFacing = () => {
    if (!capturing) setFacing((f) => (f === "back" ? "front" : "back"));
  };
  const cycleFlash = () => setFlash((f) => (f === "auto" ? "on" : f === "on" ? "off" : "auto"));

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
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
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

  // Live camera: 3:4 container so preview FOV matches capture.
  return (
    <View style={styles.root}>
      {/* 3:4 frame — vertically centered, black fills rest */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraFrame}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            flash={flash}
            animateShutter={false}
            {...(Platform.OS === "android" ? { ratio: "4:3" } : {})}
          />
          {/* Front camera has no physical flash — briefly flash the screen white instead */}
          <Animated.View
            pointerEvents="none"
            style={[styles.screenFlashOverlay, screenFlashStyle]}
          />
        </View>
      </View>

      {/* Controls overlay */}
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <View style={styles.topRow}>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text style={styles.cancelTop}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.sideSlot}>
            <Pressable
              onPress={cycleFlash}
              hitSlop={12}
              disabled={capturing}
              style={({ pressed }) => [pressed && { opacity: 0.6 }, capturing && { opacity: 0.4 }]}
            >
              <View style={styles.flashIconWrap}>
                <Ionicons
                  name={
                    flash === "on"
                      ? "flash"
                      : flash === "off"
                        ? "flash-off-outline"
                        : "flash-outline"
                  }
                  size={26}
                  color={colors.fg}
                />
                {flash === "auto" && <Text style={styles.flashAutoBadge}>A</Text>}
              </View>
            </Pressable>
          </View>

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

          <View style={styles.sideSlot}>
            <Pressable
              onPress={toggleFacing}
              hitSlop={12}
              disabled={capturing}
              style={({ pressed }) => [pressed && { opacity: 0.6 }, capturing && { opacity: 0.4 }]}
            >
              <Ionicons name="camera-reverse-outline" size={32} color={colors.fg} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  // Live camera
  cameraContainer: { flex: 1, justifyContent: "center" },
  cameraFrame: { width: "100%", aspectRatio: 3 / 4, overflow: "hidden" },
  screenFlashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  cancelTop: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  sideSlot: { width: 60, alignItems: "center" },
  flashIconWrap: { alignItems: "center", justifyContent: "center" },
  flashAutoBadge: {
    position: "absolute",
    bottom: -3,
    right: -4,
    fontSize: 11,
    fontWeight: "700",
    color: colors.fg,
    fontFamily: fonts.sans,
  },
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
});
