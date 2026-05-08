import { api } from "@commit/convex/api";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropTimer, useTimerRemaining } from "@/lib/dropTimer";

const MAX_CAPTION = 100;
const TAG_PRESETS = ["@build", "@health", "@create", "@learn", "@ship"] as const;
type Visibility = "public" | "friends" | "private";

export default function Compose() {
  const habitId = useDropTimer((s) => s.habitId);
  const difficulty = useDropTimer((s) => s.difficulty);
  const cancel = useDropTimer((s) => s.cancel);
  const remainingMs = useTimerRemaining();

  const createDrop = useMutation(api.drops.create);

  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<Visibility>("friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window expired → close modal.
  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      cancel();
      router.dismissAll();
    }
  }, [remainingMs, cancel]);

  // No active context → bail.
  useEffect(() => {
    if (habitId === null || difficulty === null) {
      router.dismissAll();
    }
  }, [habitId, difficulty]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const onSubmit = async () => {
    if (!habitId || !difficulty || busy) return;
    if (caption.length > MAX_CAPTION) return;
    setBusy(true);
    setError(null);
    try {
      await createDrop({
        habitId,
        caption,
        tags: [...selectedTags],
        difficulty,
        visibility,
      });
      cancel();
      router.dismissAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drop failed");
    } finally {
      setBusy(false);
    }
  };

  const seconds = remainingMs === null ? 0 : Math.ceil(remainingMs / 1000);
  const captionOver = caption.length > MAX_CAPTION;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.timer}>{seconds}s</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Caption</Text>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="What did you do?"
            placeholderTextColor="#555"
            autoFocus
            maxLength={MAX_CAPTION + 20}
            multiline
          />
          <Text style={[styles.charCount, captionOver && styles.charCountOver]}>
            {caption.length}/{MAX_CAPTION}
          </Text>

          <Text style={styles.fieldLabel}>Tags</Text>
          <View style={styles.chipRow}>
            {TAG_PRESETS.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Visibility</Text>
          <View style={styles.chipRow}>
            {(["public", "friends", "private"] as Visibility[]).map((v) => (
              <Pressable
                key={v}
                style={[styles.chip, visibility === v && styles.chipActive]}
                onPress={() => setVisibility(v)}
              >
                <Text style={[styles.chipText, visibility === v && styles.chipTextActive]}>
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submit, (busy || captionOver) && styles.submitDisabled]}
          onPress={() => void onSubmit()}
          disabled={busy || captionOver}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.submitText}>Drop</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backText: { color: "#888", fontSize: 16, fontFamily: fonts.sans },
  timer: {
    color: colors.fg,
    fontSize: 16,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  scroll: { padding: 20 },
  fieldLabel: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
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
  charCount: { color: "#444", fontSize: 12, fontFamily: fonts.mono, marginTop: 6 },
  charCountOver: { color: "#ff6b6b" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  chipActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  chipText: { color: "#888", fontSize: 14, fontFamily: fonts.mono },
  chipTextActive: { color: colors.bg },
  error: { color: "#ff6b6b", fontSize: 14, marginTop: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "#111" },
  submit: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: colors.bg, fontSize: 17, fontFamily: fonts.sans, fontWeight: "700" },
});
