import { Stack } from "expo-router";
import { colors } from "@commit/ui-tokens";

export default function DropLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="countdown" />
      <Stack.Screen name="compose" />
    </Stack>
  );
}
