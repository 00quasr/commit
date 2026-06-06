import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { accountDeletion } from "@/lib/account-deletion";
import { ChooseUsername } from "@/components/ChooseUsername";

export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const profile = useQuery(api.profiles.me);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sign out and show login if Convex doesn't respond within 6 seconds
  useEffect(() => {
    if (!isSignedIn) return;
    if (profile !== undefined) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }
    timeoutRef.current = setTimeout(() => setTimedOut(true), 6000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSignedIn, profile]);

  useEffect(() => {
    if (timedOut) void signOut();
  }, [timedOut, signOut]);

  // Reset the deletion flag whenever the user is signed out, so a future
  // sign-in starts from a clean slate.
  useEffect(() => {
    if (!isSignedIn) accountDeletion.inProgress = false;
  }, [isSignedIn]);

  if (!isLoaded || (isSignedIn && profile === undefined)) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (profile === null) {
    // Signed in via Clerk but no Convex profile yet — first-run username picker.
    return <ChooseUsername />;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habit/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="profile"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="drop"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="memories"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="archived-habits"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="day/[dayKey]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="habit/drops/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="u/[username]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="friends"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
