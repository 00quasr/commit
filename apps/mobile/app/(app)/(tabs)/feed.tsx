import { Ionicons } from "@expo/vector-icons";
import { api } from "@commit/convex/api";
import {
  FlashList,
  type FlashListRef,
  type ListRenderItemInfo,
  type ViewToken,
} from "@shopify/flash-list";
import { colors, fonts } from "@commit/ui-tokens";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityEventCard } from "@/components/ActivityEventCard";
import { DropCard } from "@/components/DropCard";

// Reanimated-wrapped FlashList so the scroll offset is tracked on the UI thread
// (useAnimatedScrollHandler), which the overscroll gesture reads synchronously —
// a JS-thread onScroll lags under load and made the gesture read a stale position.
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as typeof FlashList;

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

// Stable element so it isn't recreated on every Feed re-render (e.g. live updates).
function FeedEmpty() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.empty}>No drops yet today.</Text>
      <Text style={styles.emptyHint}>Friends&apos; drops appear here in real time.</Text>
    </View>
  );
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

  // Stable list callbacks so FlashList doesn't re-render all items when Feed
  // re-renders (live Convex updates can land while the user is scrolling).
  const keyExtractor = useCallback((item: FeedItem) => item.key, []);
  const getItemType = useCallback((item: FeedItem) => item.type, []);
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FeedItem>) =>
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
      ),
    [],
  );

  // Magnetic rubber-band overscroll for the whole feed (COM-147), matching the
  // Today screen's feel: the list scrolls normally, but pulling past the top or
  // bottom edge drags the whole content (header included — it's the list header)
  // with resistance and springs back on release. Android has no native bounce, so a
  // Pan gesture drives a Reanimated translateY on the UI thread.
  //
  // The Pan uses manualActivation: it stays passive so the FlashList scrolls 100%
  // normally (any auto-activating / simultaneous setup starves FlashList v2's scroll
  // on this stack). It only activates — taking over from the scroll — once the finger
  // is at an edge AND has pulled outward past a small threshold. The translate is
  // applied directly to the list's own `style` (single layer, no wrapper view) to
  // keep the bounce->scroll hand-off as smooth as possible.
  //
  // scrollY and maxScroll are read on the UI thread straight from the scroll event
  // (authoritative + lag-free), so the edge checks in the gesture worklet are exact.
  const pullY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const startTouchY = useSharedValue(0);
  // translationY at the moment the gesture activates, plus the pullY value at that
  // moment — together they let a fresh pull continue seamlessly from wherever the
  // previous spring-back currently is (no reset/snap, no activation pop).
  const activationTranslation = useSharedValue(0);
  const pullBase = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    maxScroll.value = e.contentSize.height - e.layoutMeasurement.height;
  });
  const pullGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .failOffsetX([-12, 12])
        .onTouchesDown((e) => {
          "worklet";
          startTouchY.value = e.allTouches[0]?.y ?? 0;
        })
        .onTouchesMove((e, state) => {
          "worklet";
          const y = e.allTouches[0]?.y ?? startTouchY.value;
          // Net pull since the finger went down (not frame-to-frame, which jittered).
          const disp = y - startTouchY.value;
          const THRESHOLD = 8;
          const atTop = scrollY.value <= 0;
          // "At bottom" only once there is real scrollable content (maxScroll > 1).
          const atBottom = maxScroll.value > 1 && scrollY.value >= maxScroll.value - 2;
          // Take over only on a deliberate outward pull at an edge: down at the top,
          // up at the bottom. A normal scroll has the opposite/zero direction here.
          if ((atTop && disp > THRESHOLD) || (atBottom && disp < -THRESHOLD)) {
            state.activate();
          }
        })
        .onStart((e) => {
          "worklet";
          // Take manual control from any in-flight spring-back and anchor the bounce
          // to the CURRENT pullY + translation. A re-pull therefore continues exactly
          // where the spring was (perfectly continuous, no pop and no reset snap).
          cancelAnimation(pullY);
          pullBase.value = pullY.value;
          activationTranslation.value = e.translationY;
        })
        .onUpdate((e) => {
          "worklet";
          // Resistance factor keeps the content feeling tethered to the edge.
          pullY.value = pullBase.value + (e.translationY - activationTranslation.value) * 0.4;
        })
        .onFinalize(() => {
          "worklet";
          // Same spring as the Today screen so the feel is identical.
          pullY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
        }),
    [pullY, scrollY, maxScroll, startTouchY, activationTranslation, pullBase],
  );
  // Applied to the FlashList's own container style — single compositing layer.
  const pullStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: pullY.value }],
  }));

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
        <AnimatedFlashList
          ref={listRef}
          style={pullStyle}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={1}
          data={merged}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          // Header lives inside the list so the whole content (title + subtitle +
          // cards) scrolls together as one unit, matching Today.
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
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 800 }}
          ListEmptyComponent={FeedEmpty}
        />
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
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
