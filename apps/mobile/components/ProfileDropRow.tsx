import type { Doc } from "@commit/convex/dataModel";
import { fonts, semantic } from "@commit/ui-tokens";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ProfileDropRowProps {
  drop: Doc<"drops">;
  photoUrl: string | null;
  onPress?: () => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

const VISIBILITY_GLYPH: Record<Doc<"drops">["visibility"], string> = {
  public: "🌐",
  friends: "·",
  private: "🔒",
};

export const ProfileDropRow = memo(function ProfileDropRow({
  drop,
  photoUrl,
  onPress,
}: ProfileDropRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.thumb}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.thumbFallback}>{drop.difficulty.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.caption} numberOfLines={2}>
          {drop.caption.length > 0 ? (
            drop.caption
          ) : (
            <Text style={styles.placeholder}>no caption</Text>
          )}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {VISIBILITY_GLYPH[drop.visibility]} · {relativeTime(drop.createdAt)}
          </Text>
          {drop.reactionCount > 0 && (
            <Text style={styles.metaText}>
              · {drop.reactionCount} {drop.reactionCount === 1 ? "reaction" : "reactions"}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: semantic.blockElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbFallback: {
    color: semantic.text.tertiary,
    fontSize: 18,
    fontFamily: fonts.mono,
    fontWeight: "600",
  },
  body: { flex: 1 },
  caption: {
    color: semantic.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    lineHeight: 20,
  },
  placeholder: { color: semantic.text.muted, fontStyle: "italic" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  metaText: { color: semantic.text.tertiary, fontSize: 11, fontFamily: fonts.mono },
});
