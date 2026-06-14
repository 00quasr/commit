import { Ionicons } from "@expo/vector-icons";
import { api } from "@commit/convex/api";
import { FlashList, type FlashListRef, type ViewToken } from "@shopify/flash-list";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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
  const listRef = useRef<FlashListRef<FeedItem>>(null);

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
    ({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
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

  // Magnetic rubber-band overscroll for the whole feed (COM-147), matching the
  // Today screen's feel: the list scrolls normally, but pulling past the top or
  // bottom edge drags the whole content (header included — it's the list header)
  // with resistance and springs back on release. Android has no native bounce, so
  // a Pan gesture drives a Reanimated translateY on the UI thread; it runs
  // simultaneously with the list's native scroll and only translates at the edges.
  //
  // Top vs bottom edge is computed from independently tracked heights (content via
  // onContentSizeChange, viewport via onLayout, offset via onScroll) — FlashList's
  // onScroll event does not carry reliable contentSize/layoutMeasurement, which is
  // why deriving "at bottom" from the scroll event alone never fired.
  const pullY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const contentH = useSharedValue(0);
  const viewportH = useSharedValue(0);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentH.value = h;
    },
    [contentH],
  );
  const onListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportH.value = e.nativeEvent.layout.height;
    },
    [viewportH],
  );
  const nativeGesture = useMemo(() => Gesture.Native(), []);
  const pullGesture = useMemo(
    () =>
      Gesture.Pan()
        // Only take over for clear vertical drags; horizontal/taps pass through.
        .activeOffsetY([-12, 12])
        .failOffsetX([-12, 12])
        // Run alongside the list's own scroll so normal scrolling still works.
        .simultaneousWithExternalGesture(nativeGesture)
        .onUpdate((e) => {
          "worklet";
          const max = contentH.value - viewportH.value;
          const atTop = scrollY.value <= 0;
          const atBottom = max <= 0 ? true : scrollY.value >= max - 2;
          const overscrollDown = e.translationY > 0 && atTop;
          const overscrollUp = e.translationY < 0 && atBottom;
          // Resistance factor keeps the content feeling tethered to the edges.
          pullY.value = overscrollDown || overscrollUp ? e.translationY * 0.4 : 0;
        })
        .onFinalize(() => {
          "worklet";
          pullY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
        }),
    [pullY, scrollY, contentH, viewportH, nativeGesture],
  );
  const pullStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pullY.value }] }));

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
          <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed" size={28} color="#666" />
          </View>
          <Text style={styles.lockedTitle}>Feed locked</Text>
          {result.blurredCount > 0 ? (
            <Text style={styles.lockedLabel}>
              {result.blurredCount} {result.blurredCount === 1 ? "friend" : "friends"} dropped today
            </Text>
          ) : null}
          <Text style={styles.lockedHint}>Drop something to unlock the feed.</Text>
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
      <GestureDetector gesture={pullGesture}>
        <Animated.View style={[styles.pullContainer, pullStyle]}>
          <GestureDetector gesture={nativeGesture}>
            <FlashList
              ref={listRef}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={onContentSizeChange}
              onLayout={onListLayout}
              data={merged}
              keyExtractor={(item) => item.key}
              getItemType={(item) => item.type}
              // Header lives inside the list so the whole content (title +
              // subtitle + cards) scrolls together as one unit, matching Today.
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.title}>Feed</Text>
                  <Text style={styles.subtitle}>
                    {result.drops.length === 0
                      ? "Quiet today — nothing dropped yet."
                      : `${result.drops.length} ${result.drops.length === 1 ? "drop" : "drops"} from your circle`}
                  </Text>
                </View>
              }
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
                  <Text style={styles.emptyHint}>
                    Friends&apos; drops appear here in real time.
                  </Text>
                </View>
              )}
            />
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  // Wraps the list so it can be pulled/sprung as one unit (rubber-band overscroll).
  pullContainer: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  // In-list header (unlocked feed): scrolls with the cards. 12 + the list
  // container's paddingHorizontal (8) = 20 from the screen edge, preserving the
  // original header inset now that it lives inside the list.
  listHeader: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 16 },
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
  lockedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  lockedTitle: {
    color: colors.fg,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
  },
  lockedLabel: { color: "#888", fontSize: 15, fontFamily: fonts.sans, marginTop: 8 },
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
