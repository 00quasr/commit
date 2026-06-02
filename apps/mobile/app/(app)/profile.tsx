import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemoriesGrid } from "@/components/MemoriesGrid";

export default function Profile() {
  const { signOut } = useAuth();
  const me = useQuery(api.profiles.me);
  const recent = useQuery(
    api.drops.recentForProfile,
    me ? { profileId: me._id, limit: 14 } : "skip",
  );

  if (me === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }

  if (me === null) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.placeholder}>No profile yet — sign in flow first.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          {me.avatarUrl ? (
            <Image source={{ uri: me.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{me.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{me.username}</Text>
            <Text style={styles.tz}>{me.timezone}</Text>
          </View>
        </View>

        {recent === undefined ? (
          <ActivityIndicator color={theme.text.primary} style={{ marginTop: 16 }} />
        ) : (
          <MemoriesGrid
            drops={recent}
            timezone={me.timezone}
            onViewAll={() => router.push("/(app)/memories")}
            onTileTap={(dayKey) => router.push(`/(app)/day/${dayKey}`)}
          />
        )}

        <Pressable
          style={({ pressed }) => [styles.archiveBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.push("/(app)/archived-habits")}
        >
          <Text style={styles.archiveBtnText}>Habit Archive</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
          onPress={() => void signOut()}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: { padding: 4 },
  backText: { color: theme.text.tertiary, fontSize: 18 },
  scroll: { paddingTop: 8, paddingBottom: 80 },
  placeholder: { color: theme.text.muted, fontSize: 14, fontFamily: fonts.mono },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.blockElevated },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 28,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  headerText: { flex: 1 },
  username: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  tz: { color: theme.text.tertiary, fontSize: 13, fontFamily: fonts.mono, marginTop: 2 },
  archiveBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.text.tertiary,
  },
  archiveBtnText: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  signOut: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 32,
  },
  signOutText: { color: theme.text.tertiary, fontSize: 14, fontFamily: fonts.sans },
});
