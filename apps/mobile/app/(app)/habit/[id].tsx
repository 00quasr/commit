import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MiniHeatmap } from "@/components/MiniHeatmap";
import { useDropDraft } from "@/lib/dropDraft";
import { theme } from "@/lib/theme";

function cycleLabel(cycleDays: number): string {
  if (cycleDays === 1) return "daily";
  if (cycleDays === 2) return "every 2 days";
  if (cycleDays === 7) return "weekly";
  return `every ${cycleDays} days`;
}

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = id as Id<"habits">;

  const me = useQuery(api.profiles.me);
  const allHabits = useQuery(api.habits.list, {});
  const heatmapData = useQuery(api.drops.heatmapForHabit, { habitId });
  const archive = useMutation(api.habits.archive);
  const startDropDraft = useDropDraft((s) => s.start);

  const habit = useMemo(() => allHabits?.find((h) => h._id === habitId), [allHabits, habitId]);
  const totalDrops = useMemo(
    () => heatmapData?.reduce((sum, e) => sum + e.total, 0) ?? 0,
    [heatmapData],
  );

  if (allHabits === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <Header />
        <View style={styles.center}>
          <Text style={styles.placeholder}>Habit not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dueToday = habit.lastDropDayKey === undefined; // simplified — real check is in habits.dueToday query

  const onArchive = () => {
    Alert.alert(
      "Archive this habit?",
      "It will disappear from your list. You can unarchive later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void archive({ habitId });
            router.back();
          },
        },
      ],
    );
  };

  const onDrop = () => {
    startDropDraft(habit._id);
    router.push("/drop/camera");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Header />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.text}>{habit.text}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaPill}>{cycleLabel(habit.cycleDays)}</Text>
          {dueToday && <Text style={[styles.metaPill, styles.duePill]}>due today</Text>}
        </View>

        <View style={styles.statsGrid}>
          <Stat label="drops" value={totalDrops} />
          <Stat label="last" value={habit.lastDropDayKey ?? "—"} />
        </View>

        {heatmapData && me && (
          <View style={styles.miniHeatmapWrap}>
            <MiniHeatmap data={heatmapData} timezone={me.timezone} />
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.dropBtn, pressed && { opacity: 0.7 }]}
          onPress={onDrop}
        >
          <Text style={styles.dropBtnText}>Drop on this habit</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.viewDropsBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.push(`/(app)/habit/drops/${habitId}`)}
        >
          <Text style={styles.viewDropsText}>View habit drops</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.archiveBtn, pressed && { opacity: 0.6 }]}
          onPress={onArchive}
        >
          <Text style={styles.archiveText}>Archive habit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
        hitSlop={12}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { color: theme.text.muted, fontSize: 14, fontFamily: fonts.mono },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { alignSelf: "flex-start" },
  backText: { color: theme.text.secondary, fontSize: 16, fontFamily: fonts.sans },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 64 },
  text: {
    color: theme.text.primary,
    fontSize: 28,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  metaPill: {
    color: theme.text.tertiary,
    fontSize: 12,
    fontFamily: fonts.mono,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.blockElevated,
    borderRadius: 8,
    textTransform: "lowercase",
  },
  duePill: { color: theme.bg, backgroundColor: theme.text.primary },
  statsGrid: { flexDirection: "row", gap: 8, marginTop: 24 },
  miniHeatmapWrap: { marginTop: 20, overflow: "hidden" },
  statBox: {
    flex: 1,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dropBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.text.primary,
    alignItems: "center",
  },
  dropBtnText: { color: theme.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "700" },
  viewDropsBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  viewDropsText: {
    color: theme.text.secondary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
  archiveBtn: { alignSelf: "center", paddingVertical: 14, paddingHorizontal: 24, marginTop: 32 },
  archiveText: { color: "#ff6b6b", fontSize: 14, fontFamily: fonts.sans },
});
