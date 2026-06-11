import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { accountDeletion } from "@/lib/account-deletion";
import { ChooseUsername } from "@/components/ChooseUsername";

// How long the profile query can stay pending before we surface a
// non-destructive "still connecting / retry" affordance. A slow cold start
// (Clerk handshake + socket connect + first query) is not a broken session, so
// we never sign the user out automatically — that just kicks valid users on
// poor networks back to the login screen (COM-137).
const SLOW_LOAD_MS = 12000;

export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const profile = useQuery(api.profiles.me);
  const [slowLoad, setSlowLoad] = useState(false);
  // Bumping `attempt` re-arms the slow-load timer (the Retry button).
  const [attempt, setAttempt] = useState(0);

  const stillLoading = isSignedIn === true && profile === undefined;

  useEffect(() => {
    if (!stillLoading) {
      setSlowLoad(false);
      return;
    }
    setSlowLoad(false);
    const id = setTimeout(() => setSlowLoad(true), SLOW_LOAD_MS);
    return () => clearTimeout(id);
  }, [stillLoading, attempt]);

  // Reset the deletion flag whenever the user is signed out, so a future
  // sign-in starts from a clean slate.
  useEffect(() => {
    if (!isSignedIn) accountDeletion.inProgress = false;
  }, [isSignedIn]);

  if (!isLoaded || stillLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 20,
        }}
      >
        <ActivityIndicator color="#fff" />
        {slowLoad ? (
          <>
            <Text style={{ color: "#fff", fontSize: 15, textAlign: "center" }}>
              Still connecting — check your network connection.
            </Text>
            <Pressable
              onPress={() => setAttempt((a) => a + 1)}
              hitSlop={12}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 28,
                borderRadius: 999,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ color: "#000", fontWeight: "600", fontSize: 15 }}>Retry</Text>
            </Pressable>
            <Pressable onPress={() => void signOut()} hitSlop={12} style={{ paddingVertical: 8 }}>
              <Text style={{ color: "#888", fontSize: 13 }}>Sign out</Text>
            </Pressable>
          </>
        ) : null}
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
