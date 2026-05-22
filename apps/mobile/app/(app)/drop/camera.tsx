import { colors, fonts } from "@commit/ui-tokens";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropDraft } from "@/lib/dropDraft";

export default function CameraScreen() {
  const photoUri = useDropDraft((s) => s.photoUri);
  const setPhoto = useDropDraft((s) => s.setPhoto);
  const cancel = useDropDraft((s) => s.cancel);

  const { width: screenWidth } = useWindowDimensions();
  const viewfinderHeight = Math.round((screenWidth * 4) / 3);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [capturing, setCapturing] = useState(false);

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
        const { width, height } = photo;
        const targetRatio = 3 / 4;
        const photoRatio = width / height;
        let cropWidth = width;
        let cropHeight = height;
        if (photoRatio > targetRatio) {
          cropWidth = Math.round(height * targetRatio);
        } else if (photoRatio < targetRatio) {
          cropHeight = Math.round(width / targetRatio);
        }
        const originX = Math.round((width - cropWidth) / 2);
        const originY = Math.round((height - cropHeight) / 2);
        const cropped = await manipulateAsync(
          photo.uri,
          [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
          { compress: 0.8, format: SaveFormat.JPEG },
        );
        setPhoto(cropped.uri);
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
    router.replace("/(tabs)");
  };

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
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.topRow}>
          <Pressable onPress={onRetake} hitSlop={12}>
            <Text style={styles.cancelTop}>Retake</Text>
          </Pressable>
        </View>
        <View style={[styles.viewfinderWrap, { height: viewfinderHeight }]}>
          <Image
            source={{ uri: photoUri }}
            style={{ width: screenWidth, height: viewfinderHeight }}
            resizeMode="cover"
          />
        </View>
        <View style={styles.captureWrap}>
          <Pressable style={styles.use} onPress={onUse}>
            <Text style={styles.useText}>Use photo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Live camera.
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.topRow}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.cancelTop}>Cancel</Text>
        </Pressable>
      </View>
      <View style={[styles.viewfinderWrap, { height: viewfinderHeight }]}>
        <CameraView
          ref={cameraRef}
          style={{ width: screenWidth, height: viewfinderHeight }}
          facing="back"
        />
      </View>
      <View style={styles.captureWrap}>
        <Pressable
          style={({ pressed }) => [styles.captureBtn, pressed && { transform: [{ scale: 0.95 }] }]}
          onPress={() => void onCapture()}
          disabled={capturing}
        >
          <View style={styles.captureInner} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelTop: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans },
  viewfinderWrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#111",
  },
  captureWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  use: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
  },
  useText: { color: colors.bg, fontSize: 17, fontFamily: fonts.sans, fontWeight: "700" },
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
