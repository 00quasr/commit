import { fonts } from "@commit/ui-tokens";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

export interface BottomBarProps {
  onAdd: () => void;
  disabled?: boolean;
  hint?: string;
  translateY?: SharedValue<number>;
}

export function BottomBar({ onAdd, disabled, hint, translateY }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const hintOpacity = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const flashHint = () => {
    if (!hint) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hintOpacity.value = 1;
    hideTimer.current = setTimeout(() => {
      hintOpacity.value = withTiming(0, { duration: 300 });
    }, 1200);
  };

  const onPressIn = () => {
    scaleAnim.value = withTiming(0.93, { duration: 100 });
  };

  const onPressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 150 });
  };

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY?.value ?? 0 }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));

  const bottomOffset = insets.bottom + 12;
  return (
    <Animated.View
      style={[styles.wrap, { bottom: bottomOffset }, slideStyle]}
      pointerEvents="box-none"
    >
      {hint ? (
        <Animated.View style={[styles.hintWrap, hintStyle]} pointerEvents="none">
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
        </Animated.View>
      ) : null}
      <Animated.View style={[scaleStyle, disabled && { opacity: 0.3 }]}>
        <Pressable
          style={styles.btn}
          onPress={disabled ? flashHint : onAdd}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={8}
        >
          <Text style={styles.plusIcon}>+</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
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
  hintWrap: {
    marginBottom: 16,
    maxWidth: 320,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.divide,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  hint: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: fonts.sans,
    textAlign: "center",
    lineHeight: 16,
  },
});
