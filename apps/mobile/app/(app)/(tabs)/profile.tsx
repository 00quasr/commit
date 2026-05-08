import { useAuth } from "@clerk/clerk-expo";
import { api } from "@commit/convex/api";
import { colors, fonts } from "@commit/ui-tokens";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DropCard } from "@/components/DropCard";
import { Heatmap } from "@/components/Heatmap";

export default function Profile() {
  const { signOut } = useAuth();
  const me = useQuery(api.profiles.me);
  const stats = useQuery(api.userStats.forCaller, {});
  const heatmapData = useQuery(api.drops.heatmapForProfile, me ? { profileId: me._id } : "skip");
  const recent = useQuery(api.drops.recentForProfile, me ? { profileId: me._id } : "skip");

  if (me === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.fg} />
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

  const totalXp = stats?.totalXp ?? 0;
  const level = stats?.level ?? 0;
  const streak = stats?.streak ?? 0;
  const totalDrops = stats?.totalDrops ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
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

        <View style={styles.statsGrid}>
          <Stat label="drops" value={totalDrops} />
          <Stat label="streak" value={streak} />
          <Stat label="XP" value={totalXp} />
          <Stat label="level" value={level} />
        </View>

        <View style={styles.heatmapWrap}>
          <Heatmap data={heatmapData ?? []} timezone={me.timezone} />
        </View>

        <Text style={styles.sectionLabel}>Recent drops</Text>
        {recent === undefined ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 16 }} />
        ) : recent.length === 0 ? (
          <Text style={styles.emptyRecent}>No drops yet — your first drop will show up here.</Text>
        ) : (
          <View style={styles.recentList}>
            {recent.map((item) => (
              <DropCard
                key={item.drop._id}
                drop={item.drop}
                author={item.author}
                photoUrl={item.photoUrl}
              />
            ))}
          </View>
        )}

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingTop: 16, paddingBottom: 80 },
  placeholder: { color: "#444", fontSize: 14, fontFamily: fonts.mono },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#222" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: colors.fg, fontSize: 28, fontFamily: fonts.sans, fontWeight: "600" },
  headerText: { flex: 1 },
  username: { color: colors.fg, fontSize: 22, fontFamily: fonts.sans, fontWeight: "700" },
  tz: { color: "#666", fontSize: 13, fontFamily: fonts.mono, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: {
    color: colors.fg,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heatmapWrap: { marginBottom: 32 },
  sectionLabel: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recentList: { paddingHorizontal: 20 },
  emptyRecent: {
    color: "#555",
    fontSize: 14,
    fontFamily: fonts.sans,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  signOut: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  signOutText: { color: "#666", fontSize: 14, fontFamily: fonts.sans },
});
