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
import { TodoRow } from "@/components/TodoRow";

type Difficulty = "easy" | "medium" | "hard";

export default function Today() {
  const todos = useQuery(api.todos.todayForUser, {});
  const createTodo = useMutation(api.todos.create);
  const completeTodo = useMutation(api.todos.complete);

  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftDifficulty, setDraftDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);

  const open = todos?.filter((t) => t.completedAt === undefined) ?? [];
  const done = todos?.filter((t) => t.completedAt !== undefined) ?? [];

  const onAdd = async () => {
    const text = draftText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await createTodo({ text, difficulty: draftDifficulty });
      setDraftText("");
      setDraftDifficulty("medium");
      setShowAdd(false);
    } finally {
      setBusy(false);
    }
  };

  if (todos === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  const data = [...open, ...done];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>What are you shipping?</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <TodoRow
            text={item.text}
            difficulty={item.difficulty}
            isDone={item.completedAt !== undefined}
            onToggle={() => {
              if (item.completedAt === undefined) {
                void completeTodo({ todoId: item._id });
              }
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>Nothing yet.</Text>
            <Text style={styles.emptyHint}>Tap + to commit to one thing.</Text>
          </View>
        )}
        contentContainerStyle={data.length === 0 ? styles.listEmpty : styles.list}
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
              placeholder="What are you shipping today?"
              placeholderTextColor="#555"
              autoFocus
              maxLength={280}
              multiline
            />
            <View style={styles.diffRow}>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <Pressable
                  key={d}
                  style={[styles.diff, draftDifficulty === d && styles.diffActive]}
                  onPress={() => setDraftDifficulty(d)}
                >
                  <Text style={[styles.diffText, draftDifficulty === d && styles.diffTextActive]}>
                    {d}
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
  diffRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  diff: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  diffActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  diffText: { color: "#888", fontSize: 14, fontFamily: fonts.mono, textTransform: "uppercase" },
  diffTextActive: { color: colors.bg },
  sheetButtons: { flexDirection: "row", gap: 8, marginTop: 16 },
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
