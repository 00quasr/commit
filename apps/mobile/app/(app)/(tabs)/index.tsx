import { api } from "@commit/convex/api";
import { fonts, habitColors } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomBar } from "@/components/BottomBar";
import { Heatmap } from "@/components/Heatmap";
import { HabitRow } from "@/components/HabitRow";
import { useDropDraft } from "@/lib/dropDraft";

const CYCLE_PRESETS: Array<{ label: string; days: number }> = [
  { label: "Daily", days: 1 },
  { label: "Every 2 days", days: 2 },
  { label: "Weekly", days: 7 },
];

export default function Today() {
  const me = useQuery(api.profiles.me);
  const stats = useQuery(api.userStats.forCaller, {});
  const heatmapData = useQuery(api.drops.heatmapForProfile, me ? { profileId: me._id } : "skip");
  const dueHabits = useQuery(api.habits.dueToday, {});
  const allHabits = useQuery(api.habits.list, {});
  const createHabit = useMutation(api.habits.create);
  const archiveHabit = useMutation(api.habits.archive);
  const startDropDraft = useDropDraft((s) => s.start);

  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftCycle, setDraftCycle] = useState<number>(1);
  const [draftColor, setDraftColor] = useState<string>(habitColors[0]);
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => {
    if (!dueHabits || !allHabits) return [];
    const dueIds = new Set(dueHabits.map((h) => h._id));
    const notDue = allHabits.filter((h) => !dueIds.has(h._id));
    return [
      { title: "Due today", data: dueHabits },
      { title: "Not due today", data: notDue },
    ].filter((s) => s.data.length > 0);
  }, [dueHabits, allHabits]);

  const onAdd = async () => {
    const text = draftText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await createHabit({ text, cycleDays: draftCycle, color: draftColor });
      setDraftText("");
      setDraftCycle(1);
      setDraftColor(habitColors[0]);
      setShowAdd(false);
    } finally {
      setBusy(false);
    }
  };

  if (dueHabits === undefined || allHabits === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }

  const isEmpty = allHabits.length === 0;
  const atMax = allHabits.length >= 3;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Today</Text>
          <Pressable
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            {me?.avatarUrl ? (
              <Image source={{ uri: me.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {me?.username?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {isEmpty
            ? "Add the first thing you want to keep doing."
            : dueHabits.length === 0
              ? "Nothing due today. Come back tomorrow."
              : `${dueHabits.length} ${dueHabits.length === 1 ? "habit" : "habits"} due`}
        </Text>
      </View>

      {isEmpty ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <StatsAndHeatmap
            stats={stats}
            heatmapData={heatmapData ?? []}
            timezone={me?.timezone ?? "UTC"}
          />
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Quiet start.</Text>
            <Text style={styles.emptyHint}>Tap + to commit to your first habit.</Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <StatsAndHeatmap
              stats={stats}
              heatmapData={heatmapData ?? []}
              timezone={me?.timezone ?? "UTC"}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const doneToday =
              section.title === "Not due today" && item.lastDropDayKey !== undefined;
            return (
              <Swipeable
                renderRightActions={() => (
                  <View style={styles.archiveAction}>
                    <Text style={styles.archiveText}>Archive</Text>
                  </View>
                )}
                onSwipeableRightOpen={() => {
                  void archiveHabit({ habitId: item._id });
                }}
                rightThreshold={48}
                friction={1.6}
              >
                <HabitRow
                  text={item.text}
                  cycleDays={item.cycleDays}
                  color={item.color}
                  doneToday={doneToday}
                  onPress={() => router.push(`/habit/${item._id}`)}
                  onLongPress={() => {
                    startDropDraft(item._id);
                    router.push("/drop/camera");
                  }}
                />
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <BottomBar
        onAdd={() => setShowAdd(true)}
        disabled={atMax}
        hint={atMax ? "Max. 3 habits. Archive one to add a new one." : undefined}
      />

      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New commitment</Text>

            <TextInput
              style={styles.input}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What do you want to keep doing?"
              placeholderTextColor={theme.text.muted}
              autoFocus
              maxLength={280}
              multiline
            />

            <Text style={styles.fieldLabel}>Cycle</Text>
            <View style={styles.chipRow}>
              {CYCLE_PRESETS.map((c) => (
                <Pressable
                  key={c.days}
                  style={[styles.chip, draftCycle === c.days && styles.chipActive]}
                  onPress={() => setDraftCycle(c.days)}
                >
                  <Text style={[styles.chipText, draftCycle === c.days && styles.chipTextActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {habitColors.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraftColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    draftColor === color && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.sheetButtons}>
              <Pressable style={styles.cancel} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.add, (!draftText.trim() || busy) && styles.addDisabled]}
                onPress={() => void onAdd()}
                disabled={!draftText.trim() || busy}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatsAndHeatmap({
  stats,
  heatmapData,
  timezone,
}: {
  stats: { streak: number; totalDrops: number } | null | undefined;
  heatmapData: { dayKey: string; total: number; habits: { habitId: string; color: string }[] }[];
  timezone: string;
}) {
  return (
    <View style={styles.statsSection}>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.totalDrops ?? 0}</Text>
          <Text style={styles.statLabel}>DROPS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>STREAK</Text>
        </View>
      </View>
      <View style={styles.heatmapWrap}>
        <Heatmap data={heatmapData} timezone={timezone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  avatarButton: {},
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.blockElevated },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  title: {
    color: theme.text.primary,
    fontSize: 36,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 4,
  },
  statsSection: { paddingBottom: 8 },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heatmapWrap: { marginBottom: 8 },
  emptyScroll: { flexGrow: 1, paddingBottom: 120 },
  list: { paddingBottom: 180 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: {
    color: theme.text.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  sep: { height: 1, backgroundColor: theme.divide, marginLeft: 56 },
  archiveAction: {
    backgroundColor: "#1a0e0e",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: "#3a1414",
  },
  archiveText: {
    color: "#ff8a8a",
    fontSize: 13,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  emptyHint: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 8,
    textAlign: "center",
  },
  // Sheet
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: "#0e0e0e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    textAlignVertical: "top",
  },
  fieldLabel: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 2.5, borderColor: "#ffffff" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.borderHairline,
  },
  chipActive: { backgroundColor: theme.text.primary, borderColor: theme.text.primary },
  chipText: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
  },
  chipTextActive: { color: theme.bg },
  sheetButtons: { flexDirection: "row", gap: 8, marginTop: 24 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.borderHairline,
    alignItems: "center",
  },
  cancelText: { color: theme.text.secondary, fontSize: 16, fontFamily: fonts.sans },
  add: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.text.primary,
    alignItems: "center",
  },
  addDisabled: { opacity: 0.4 },
  addText: { color: theme.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
});
