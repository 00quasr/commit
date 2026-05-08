import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomBar } from "@/components/BottomBar";
import { HabitRow } from "@/components/HabitRow";
import { useDropTimer } from "@/lib/dropTimer";

type Difficulty = "easy" | "medium" | "hard";

const CYCLE_PRESETS: Array<{ label: string; days: number }> = [
  { label: "Daily", days: 1 },
  { label: "Every 2 days", days: 2 },
  { label: "Weekly", days: 7 },
];

export default function Today() {
  const dueHabits = useQuery(api.habits.dueToday, {});
  const allHabits = useQuery(api.habits.list, {});
  const createHabit = useMutation(api.habits.create);
  const archiveHabit = useMutation(api.habits.archive);
  const startDropTimer = useDropTimer((s) => s.start);

  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftDifficulty, setDraftDifficulty] = useState<Difficulty>("medium");
  const [draftCycle, setDraftCycle] = useState<number>(1);
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
      await createHabit({ text, difficulty: draftDifficulty, cycleDays: draftCycle });
      setDraftText("");
      setDraftDifficulty("medium");
      setDraftCycle(1);
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>
          {isEmpty
            ? "Add the first thing you want to keep doing."
            : dueHabits.length === 0
              ? "Nothing due today. Come back tomorrow."
              : `${dueHabits.length} ${dueHabits.length === 1 ? "habit" : "habits"} due`}
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Quiet start.</Text>
          <Text style={styles.emptyHint}>Tap + to commit to your first habit.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
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
                  difficulty={item.difficulty}
                  cycleDays={item.cycleDays}
                  doneToday={doneToday}
                  onPress={() => {
                    if (section.title !== "Due today") return;
                    startDropTimer(item._id, item.difficulty);
                    router.push("/drop/countdown");
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

      <BottomBar onAdd={() => setShowAdd(true)} />

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalRoot}>
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

            <Text style={styles.fieldLabel}>Difficulty</Text>
            <View style={styles.chipRow}>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <Pressable
                  key={d}
                  style={[styles.chip, draftDifficulty === d && styles.chipActive]}
                  onPress={() => setDraftDifficulty(d)}
                >
                  <Text style={[styles.chipText, draftDifficulty === d && styles.chipTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>

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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
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
  list: { paddingBottom: 120 },
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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
