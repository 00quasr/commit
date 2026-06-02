import { fonts } from "@commit/ui-tokens";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

export interface BottomBarProps {
  onAdd: () => void;
  disabled?: boolean;
  hint?: string;
}

export function BottomBar({ onAdd, disabled, hint }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
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
    hintOpacity.setValue(1);
    hideTimer.current = setTimeout(() => {
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1600);
  };

  const onPressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.93,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const bottomOffset = insets.bottom + 12;
  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      {hint ? (
        <Animated.Text style={[styles.hint, { opacity: hintOpacity }]} numberOfLines={1}>
          {hint}
        </Animated.Text>
      ) : null}
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, disabled && { opacity: 0.3 }]}>
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
  hint: {
    color: theme.text.tertiary,
    fontSize: 12,
    fontFamily: fonts.sans,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
