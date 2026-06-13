import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDropDraft } from "@/lib/dropDraft";

const MAX_CAPTION = 100;

export default function Compose() {
  const habitId = useDropDraft((s) => s.habitId);
  const photoUri = useDropDraft((s) => s.photoUri);
  const cancel = useDropDraft((s) => s.cancel);

  const generateUploadUrl = useMutation(api.drops.generateUploadUrl);
  const createDrop = useMutation(api.drops.create);

  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);
  // Synchronous guard against double-taps: `busy` only takes effect after a
  // re-render, which is too slow to block two onPress calls fired back to back.
  const submittingRef = useRef(false);

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
    if (!habitId || submittingRef.current) return;
    if (caption.length > MAX_CAPTION) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      let photoFileId: Id<"_storage"> | undefined;

      if (photoUri) {
        setStage("uploading");
        photoFileId = await uploadFile(photoUri, "image/jpeg");
      }

      setStage("creating");
      await createDrop({
        habitId,
        caption,
        visibility: "public",
        ...(photoFileId !== undefined ? { photoFileId } : {}),
      });
      cancel();
      router.replace("/(tabs)");
      // Stay busy/disabled on success — the screen is still mounted and
      // tappable during the replace transition, and resetting here re-enables
      // "Drop" long enough for a second tap to create a duplicate drop.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drop failed");
      submittingRef.current = false;
      setBusy(false);
      setStage("idle");
    }
  };

  const captionOver = caption.length > MAX_CAPTION;
  const submitLabel =
    stage === "uploading" ? "Uploading…" : stage === "creating" ? "Submitting…" : "Drop";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={busy}>
          <Text style={[styles.backText, busy && { opacity: 0.4 }]}>← Retake</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {photoUri && (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
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

        {error && <Text style={styles.error}>{error}</Text>}
      </KeyboardAwareScrollView>

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
  scroll: { padding: 20 },
  photoWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
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
