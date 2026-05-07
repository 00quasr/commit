import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const profile = useQuery(api.profiles.me);
  const upsert = useMutation(api.profiles.upsert);

  useEffect(() => {
    if (profile === null && user) {
      const username =
        user.username ??
        user.firstName ??
        user.primaryEmailAddress?.emailAddress.split("@")[0] ??
        "builder";
      const args = {
        username,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(user.imageUrl ? { avatarUrl: user.imageUrl } : {}),
      };
      void upsert(args);
    }
  }, [profile, upsert, user]);

  if (profile === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.greeting}>Hello,</Text>
        <Text style={styles.name}>{profile?.username ?? "…"}</Text>
        <Text style={styles.tagline}>The drop is the proof.</Text>
      </View>
      <Pressable
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  greeting: {
    color: "#666",
    fontSize: 24,
    fontFamily: fonts.sans,
  },
  name: {
    color: colors.fg,
    fontSize: 48,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginTop: 4,
  },
  tagline: {
    color: "#444",
    fontSize: 14,
    fontFamily: fonts.mono,
    marginTop: 32,
  },
  signOut: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  signOutText: {
    color: "#666",
    fontSize: 14,
  },
});
