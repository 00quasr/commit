import { api } from "@commit/convex/api";
import type { Doc, Id } from "@commit/convex/dataModel";
import { colors, fonts } from "@commit/ui-tokens";
import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MiniHeatmap } from "./MiniHeatmap";

const REACTIONS = ["🔥", "💪", "👀", "💯"] as const;
type ReactionEmoji = (typeof REACTIONS)[number];

export interface DropCardProps {
  drop: Doc<"drops">;
  author: Doc<"profiles">;
  photoUrl: string | null;
  authorHeatmap: Array<{ dayKey: string; count: number }>;
  onVisible?: (dropId: Id<"drops">) => void;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const DropCard = memo(function DropCard({ drop, author, photoUrl, authorHeatmap }: DropCardProps) {
  const toggleReaction = useMutation(api.reactions.toggle);

  const onTapEmoji = useCallback(
    (emoji: ReactionEmoji) => {
      void toggleReaction({ dropId: drop._id, emoji });
    },
    [drop._id, toggleReaction],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {author.avatarUrl ? (
            <Image source={{ uri: author.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{author.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{author.username}</Text>
            <Text style={styles.time}>{timeAgo(drop.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.statsPanel}>
          <View style={styles.statsPanelLeft}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>streak</Text>
              <Text style={styles.statValue}>
                {drop.streakAtDrop ?? "—"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>drop</Text>
              <Text style={styles.statValue}>
                {drop.totalDropsAtDrop ?? "—"}
              </Text>
            </View>
          </View>
          <View style={styles.statsPanelDivider} />
          <View style={styles.statsPanelRight}>
            <MiniHeatmap data={authorHeatmap} timezone={author.timezone} />
          </View>
        </View>
      </View>

      {photoUrl && (
        <View style={styles.photoWrap}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={120}
          />
        </View>
      )}

      {drop.caption.length > 0 && <Text style={styles.caption}>{drop.caption}</Text>}

      {drop.tags.length > 0 && (
        <View style={styles.tagRow}>
          {drop.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.reactionRow}>
          {REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onTapEmoji(emoji)}
              style={({ pressed }) => [styles.reactionBtn, pressed && { opacity: 0.6 }]}
              hitSlop={4}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.counts}>
          {drop.reactionCount > 0 ? `${drop.reactionCount} reactions · ` : ""}
          {drop.viewCount} {drop.viewCount === 1 ? "view" : "views"}
        </Text>
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "stretch", gap: 10, marginBottom: 12, minHeight: 44 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#222" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
  headerText: {},
  statsPanel: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 10,
    overflow: "hidden",
  },
  statsPanelLeft: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statItem: { alignItems: "flex-end" },
  statLabel: { color: "#555", fontSize: 8, fontFamily: fonts.mono, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { color: colors.fg, fontSize: 10, fontFamily: fonts.mono, fontWeight: "600" },
  statDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#2a2a2a", marginHorizontal: -10 },
  statsPanelDivider: { width: StyleSheet.hairlineWidth, backgroundColor: "#2a2a2a" },
  statsPanelRight: { padding: 8 },
  username: { color: colors.fg, fontSize: 15, fontFamily: fonts.sans, fontWeight: "600" },
  time: { color: "#666", fontSize: 12, fontFamily: fonts.mono, marginTop: 2 },
  photoWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
    marginBottom: 12,
  },
  photo: { width: "100%", height: "100%" },
  caption: { color: colors.fg, fontSize: 16, fontFamily: fonts.sans, lineHeight: 22 },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  tag: { color: "#888", fontSize: 13, fontFamily: fonts.mono },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reactionRow: { flexDirection: "row", gap: 16 },
  reactionBtn: { paddingVertical: 4 },
  reactionEmoji: { fontSize: 22 },
  counts: { color: "#555", fontSize: 11, fontFamily: fonts.mono },
});
