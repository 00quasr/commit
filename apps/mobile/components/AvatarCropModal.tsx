import { SaveFormat, manipulateAsync } from "expo-image-manipulator";
import { Image } from "expo-image";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;
const CIRCLE_D = SCREEN_W;

interface Props {
  visible: boolean;
  uri: string;
  imageWidth: number;
  imageHeight: number;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

export function AvatarCropModal({
  visible,
  uri,
  imageWidth,
  imageHeight,
  onCancel,
  onConfirm,
}: Props) {
  const [processing, setProcessing] = useState(false);

  const minScale = useMemo(
    () => Math.max(CIRCLE_D / imageWidth, CIRCLE_D / imageHeight),
    [imageWidth, imageHeight],
  );

  const userScale = useSharedValue(1);
  const savedUserScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      userScale.value = 1;
      savedUserScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTX.value = 0;
      savedTY.value = 0;
    }
  }, [visible, userScale, savedUserScale, translateX, translateY, savedTX, savedTY]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    })
    .onUpdate((e) => {
      const s = minScale * userScale.value;
      const maxTX = Math.max(0, (imageWidth * s - CIRCLE_D) / 2);
      const maxTY = Math.max(0, (imageHeight * s - CIRCLE_D) / 2);
      translateX.value = Math.max(-maxTX, Math.min(maxTX, savedTX.value + e.translationX));
      translateY.value = Math.max(-maxTY, Math.min(maxTY, savedTY.value + e.translationY));
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedUserScale.value = userScale.value;
    })
    .onUpdate((e) => {
      userScale.value = Math.max(1, Math.min(5, savedUserScale.value * e.scale));
      const s = minScale * userScale.value;
      const maxTX = Math.max(0, (imageWidth * s - CIRCLE_D) / 2);
      const maxTY = Math.max(0, (imageHeight * s - CIRCLE_D) / 2);
      translateX.value = Math.max(-maxTX, Math.min(maxTX, translateX.value));
      translateY.value = Math.max(-maxTY, Math.min(maxTY, translateY.value));
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Both the background and circle images use the same animated style.
  // Both Animated.Views are centered on the screen, so the same transform
  // maps to the same region of the image in both layers.
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: minScale * userScale.value },
    ],
  }));

  const handleConfirm = useCallback(async () => {
    setProcessing(true);
    try {
      const s = minScale * userScale.value;
      const cropSizePx = CIRCLE_D / s;
      const originX = Math.max(
        0,
        Math.round(imageWidth / 2 - translateX.value / s - cropSizePx / 2),
      );
      const originY = Math.max(
        0,
        Math.round(imageHeight / 2 - translateY.value / s - cropSizePx / 2),
      );
      const width = Math.min(Math.round(cropSizePx), imageWidth - originX);
      const height = Math.min(Math.round(cropSizePx), imageHeight - originY);

      const result = await manipulateAsync(
        uri,
        [{ crop: { originX, originY, width, height } }, { resize: { width: 400 } }],
        { compress: 0.7, format: SaveFormat.JPEG },
      );
      onConfirm(result.uri);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  }, [
    uri,
    imageWidth,
    imageHeight,
    minScale,
    userScale,
    translateX,
    translateY,
    onConfirm,
    onCancel,
  ]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.container}>
        {/* Full-screen gesture area. Both image layers share the same animStyle
            so they always show the same region — the circle layer is just clipped
            to a circle and shown at full opacity while the background is dimmed. */}
        <GestureDetector gesture={gesture}>
          <View style={styles.gestureArea}>
            {/* Dimmed background image: full image visible for orientation */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: imageWidth,
                  height: imageHeight,
                  left: (SCREEN_W - imageWidth) / 2,
                  top: (SCREEN_H - imageHeight) / 2,
                },
                animStyle,
              ]}
            >
              <Image
                source={{ uri }}
                style={{ width: imageWidth, height: imageHeight, opacity: 0.3 }}
              />
            </Animated.View>

            {/* Circular crop area: full opacity, clipped to circle */}
            <View style={styles.cropCircle}>
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: imageWidth,
                    height: imageHeight,
                    left: (CIRCLE_D - imageWidth) / 2,
                    top: (CIRCLE_D - imageHeight) / 2,
                  },
                  animStyle,
                ]}
              >
                <Image source={{ uri }} style={{ width: imageWidth, height: imageHeight }} />
              </Animated.View>
            </View>
          </View>
        </GestureDetector>

        {/* Cancel — rendered after gesture area so it sits on top and receives taps first */}
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {/* Choose — large white button at bottom */}
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => void handleConfirm()}
            style={styles.chooseBtn}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text style={styles.chooseBtnText}>Choose</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  gestureArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cropCircle: {
    position: "absolute",
    width: CIRCLE_D,
    height: CIRCLE_D,
    borderRadius: CIRCLE_D / 2,
    overflow: "hidden",
    // Vertically centered on screen so the image layers align.
    top: (SCREEN_H - CIRCLE_D) / 2,
    left: 0,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  cancelBtn: {
    position: "absolute",
    top: 56,
    left: 20,
  },
  cancelText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 17,
    fontFamily: fonts.sans,
  },
  bottomRow: {
    position: "absolute",
    bottom: 48,
    left: 20,
    right: 20,
  },
  chooseBtn: {
    backgroundColor: theme.text.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  chooseBtnText: {
    color: theme.bg,
    fontSize: 17,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
});
