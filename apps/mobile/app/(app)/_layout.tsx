import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { useMutation, useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const profile = useQuery(api.profiles.me);
  const upsertProfile = useMutation(api.profiles.upsert);
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

  useEffect(() => {
    if (!isSignedIn || !user || profile !== null) return;
    const username =
      user.username ??
      user.firstName?.toLowerCase() ??
      user.emailAddresses[0]?.emailAddress.split("@")[0] ??
      `user${Date.now()}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    upsertProfile({ username, avatarUrl: user.imageUrl || undefined, timezone }).catch(() => {
      void signOut();
    });
  }, [isSignedIn, user, profile, upsertProfile, signOut]);

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
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habit/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="drop"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
