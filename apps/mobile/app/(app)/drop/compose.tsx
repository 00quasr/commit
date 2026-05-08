import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useDropTimer, useTimerRemaining } from "@/lib/dropTimer";

const MAX_CAPTION = 100;
const TAG_PRESETS = ["@build", "@health", "@create", "@learn", "@ship"] as const;
type Visibility = "public" | "friends" | "private";

export default function Compose() {
  const habitId = useDropTimer((s) => s.habitId);
  const difficulty = useDropTimer((s) => s.difficulty);
  const photoUri = useDropTimer((s) => s.photoUri);
  const voiceUri = useDropTimer((s) => s.voiceUri);
  const setVoice = useDropTimer((s) => s.setVoice);
  const cancel = useDropTimer((s) => s.cancel);
  const remainingMs = useTimerRemaining();

  const generateUploadUrl = useMutation(api.drops.generateUploadUrl);
  const createDrop = useMutation(api.drops.create);

  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<Visibility>("friends");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);

  // Window expired → close modal. We do NOT also key on habitId/difficulty
  // becoming null, because cancel() in onSubmit deliberately sets them null
  // and re-firing dismiss() after we already dismissed produces a noisy
  // POP_TO_TOP warning from react-navigation.
  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      cancel();
      router.dismiss();
    }
  }, [remainingMs, cancel]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const uploadFile = async (uri: string, contentType: string): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const fileResp = await fetch(uri);
    const blob = await fileResp.blob();
    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type || contentType },
      body: blob,
    });
    if (!uploadResp.ok) {
      throw new Error(`Upload failed: ${uploadResp.status}`);
    }
    const json = (await uploadResp.json()) as { storageId: Id<"_storage"> };
    return json.storageId;
  };

  const onSubmit = async () => {
    if (!habitId || !difficulty || busy) return;
    if (caption.length > MAX_CAPTION) return;
    setBusy(true);
    setError(null);
    try {
      let photoFileId: Id<"_storage"> | undefined;
      let voiceFileId: Id<"_storage"> | undefined;

      if (photoUri || voiceUri) {
        setStage("uploading");
        if (photoUri) {
          photoFileId = await uploadFile(photoUri, "image/jpeg");
        }
        if (voiceUri) {
          voiceFileId = await uploadFile(voiceUri, "audio/m4a");
        }
      }

      setStage("creating");
      await createDrop({
        habitId,
        caption,
        tags: [...selectedTags],
        difficulty,
        visibility,
        ...(photoFileId !== undefined ? { photoFileId } : {}),
        ...(voiceFileId !== undefined ? { voiceFileId } : {}),
      });
      cancel();
      router.dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drop failed");
    } finally {
      setBusy(false);
      setStage("idle");
    }
  };

  const seconds = remainingMs === null ? 0 : Math.ceil(remainingMs / 1000);
  const captionOver = caption.length > MAX_CAPTION;
  const submitLabel =
    stage === "uploading" ? "Uploading…" : stage === "creating" ? "Submitting…" : "Drop";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={busy}>
          <Text style={[styles.backText, busy && { opacity: 0.4 }]}>← Back</Text>
        </Pressable>
        <Text style={styles.timer}>{seconds}s</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {photoUri && (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            </View>
          )}

          <Text style={styles.fieldLabel}>Caption</Text>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="What did you do?"
            placeholderTextColor="#555"
            autoFocus={!photoUri}
            maxLength={MAX_CAPTION + 20}
            multiline
          />
          <Text style={[styles.charCount, captionOver && styles.charCountOver]}>
            {caption.length}/{MAX_CAPTION}
          </Text>

          <Text style={styles.fieldLabel}>Voice memo</Text>
          <VoiceRecorder uri={voiceUri} onChange={setVoice} />

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
            <View style={styles.submitBusy}>
              <ActivityIndicator color={colors.bg} />
              <Text style={styles.submitText}>{submitLabel}</Text>
            </View>
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
  photoWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    marginBottom: 8,
  },
  photo: { width: "100%", height: "100%" },
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
  submitBusy: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { color: colors.bg, fontSize: 17, fontFamily: fonts.sans, fontWeight: "700" },
});
