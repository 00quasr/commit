import { api } from "@commit/convex/api";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityEventCard } from "@/components/ActivityEventCard";
import { DropCard } from "@/components/DropCard";

type DropsResult = FunctionReturnType<typeof api.drops.feedForUser>;
type UnlockedDrops = Extract<DropsResult, { locked: false }>;
type FeedDrop = UnlockedDrops["drops"][number];
type FeedEvent = FunctionReturnType<typeof api.activityEvents.feedForUser>[number];
type FeedItem =
  | { type: "drop"; createdAt: number; key: string; item: FeedDrop }
  | { type: "event"; createdAt: number; key: string; item: FeedEvent };

// Cards near the top of the feed are visible the instant the screen mounts,
// so they should win the image-loading queue over ones the user hasn't
// scrolled to yet — this keeps photos appearing top-down instead of popping
// in out of order.
function imagePriorityForIndex(index: number): "low" | "normal" | "high" {
  if (index < 2) return "high";
  if (index < 6) return "normal";
  return "low";
}

export default function Feed() {
  const result = useQuery(api.drops.feedForUser, {});
  const events = useQuery(api.activityEvents.feedForUser, {});
  const markSeen = useMutation(api.views.markSeen);
  const seenLocally = useRef(new Set<string>());
  const listRef = useRef<FlatList>(null);

  const merged = useMemo<FeedItem[]>(() => {
    if (!result || result.locked) return [];
    const items: FeedItem[] = [];
    for (const d of result.drops) {
      items.push({
        type: "drop",
        createdAt: d.drop.createdAt,
        key: `drop:${d.drop._id}`,
        item: d,
      });
    }
    for (const e of events ?? []) {
      items.push({ type: "event", createdAt: e.createdAt, key: `event:${e._id}`, item: e });
    }
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [result, events]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const item of viewableItems) {
        const entry = item.item as FeedItem;
        if (entry.type !== "drop") continue;
        const dropId = entry.item.drop._id;
        if (!seenLocally.current.has(dropId)) {
          seenLocally.current.add(dropId);
          void markSeen({ dropId });
        }
      }
    },
    [markSeen],
  );

  if (result === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  if (result.locked) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Feed</Text>
        </View>
        <View style={styles.lockedCenter}>
          <Text style={styles.lockedCount}>{result.blurredCount}</Text>
          <Text style={styles.lockedLabel}>
            {result.blurredCount === 1 ? "friend dropped today" : "friends dropped today"}
          </Text>
          <Text style={styles.lockedHint}>Drop something to see their proof.</Text>
          <Pressable
            style={({ pressed }) => [styles.dropCta, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.dropCtaText}>Go to Today →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>
          {result.drops.length === 0
            ? "Quiet today — nothing dropped yet."
            : `${result.drops.length} ${result.drops.length === 1 ? "drop" : "drops"} from your circle`}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        showsVerticalScrollIndicator={false}
        data={merged}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) =>
          item.type === "drop" ? (
            <DropCard
              drop={item.item.drop}
              author={item.item.author}
              photoUrl={item.item.photoUrl}
              authorHeatmap={item.item.authorHeatmap}
              habitColor={item.item.habitColor}
              habitText={item.item.habitText}
              scrollRef={listRef}
              imagePriority={imagePriorityForIndex(index)}
            />
          ) : (
            <ActivityEventCard event={item.item} />
          )
        }
        contentContainerStyle={styles.list}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 800 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No drops yet today.</Text>
            <Text style={styles.emptyHint}>Friends&apos; drops appear here in real time.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { color: colors.fg, fontSize: 36, fontFamily: fonts.sans, fontWeight: "700" },
  subtitle: { color: "#666", fontSize: 14, fontFamily: fonts.sans, marginTop: 4 },
  list: { paddingHorizontal: 8, paddingBottom: 40 },
  emptyWrap: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  empty: { color: colors.fg, fontSize: 18, fontFamily: fonts.sans },
  emptyHint: {
    color: "#555",
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 8,
    textAlign: "center",
  },
  // Locked state
  lockedCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  lockedCount: {
    color: colors.fg,
    fontSize: 96,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  lockedLabel: { color: "#888", fontSize: 16, fontFamily: fonts.sans, marginTop: 4 },
  lockedHint: {
    color: "#666",
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 24,
    textAlign: "center",
  },
  dropCta: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: colors.fg,
  },
  dropCtaText: { color: colors.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "700" },
});
