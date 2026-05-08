import { api } from "@commit/convex/api";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HabitRow } from "@/components/HabitRow";

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

  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftDifficulty, setDraftDifficulty] = useState<Difficulty>("medium");
  const [draftCycle, setDraftCycle] = useState<number>(1);
  const [busy, setBusy] = useState(false);

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
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  const notDueCount = allHabits.length - dueHabits.length;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>
          {dueHabits.length === 0
            ? allHabits.length === 0
              ? "Add your first commitment."
              : "All caught up — nothing due today."
            : `${dueHabits.length} due${notDueCount > 0 ? ` · ${notDueCount} not due today` : ""}`}
        </Text>
      </View>

      <FlatList
        data={dueHabits}
        keyExtractor={(h) => h._id}
        renderItem={({ item }) => (
          <HabitRow
            text={item.text}
            difficulty={item.difficulty}
            cycleDays={item.cycleDays}
            onPress={() => {
              // Drop composer lands in P3 commit 2; for now this is a no-op.
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            {allHabits.length === 0 ? (
              <>
                <Text style={styles.empty}>Nothing yet.</Text>
                <Text style={styles.emptyHint}>Tap + to add a habit you want to keep.</Text>
              </>
            ) : (
              <>
                <Text style={styles.empty}>All caught up.</Text>
                <Text style={styles.emptyHint}>Come back tomorrow.</Text>
              </>
            )}
          </View>
        )}
        contentContainerStyle={dueHabits.length === 0 ? styles.listEmpty : styles.list}
      />

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

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
              placeholderTextColor="#555"
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
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { color: colors.fg, fontSize: 36, fontFamily: fonts.sans, fontWeight: "700" },
  subtitle: { color: "#666", fontSize: 14, fontFamily: fonts.sans, marginTop: 4 },
  list: { paddingBottom: 120 },
  listEmpty: { flex: 1, justifyContent: "center" },
  sep: { height: 1, backgroundColor: "#111", marginLeft: 58 },
  emptyWrap: { alignItems: "center", paddingHorizontal: 32 },
  empty: { color: colors.fg, fontSize: 18, fontFamily: fonts.sans },
  emptyHint: { color: "#555", fontSize: 14, fontFamily: fonts.sans, marginTop: 8 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: colors.bg, fontSize: 28, fontWeight: "300", lineHeight: 32 },
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
    color: colors.fg,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    color: colors.fg,
    fontSize: 18,
    fontFamily: fonts.sans,
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    textAlignVertical: "top",
  },
  fieldLabel: {
    color: "#666",
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
    borderColor: "#333",
  },
  chipActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  chipText: { color: "#888", fontSize: 14, fontFamily: fonts.mono, textTransform: "uppercase" },
  chipTextActive: { color: colors.bg },
  sheetButtons: { flexDirection: "row", gap: 8, marginTop: 24 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  cancelText: { color: "#888", fontSize: 16, fontFamily: fonts.sans },
  add: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.fg,
    alignItems: "center",
  },
  addDisabled: { opacity: 0.4 },
  addText: { color: colors.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
});
