import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { FlashList } from "@shopify/flash-list";
import { fonts, habitColors } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  type SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomBar } from "@/components/BottomBar";
import { Heatmap } from "@/components/Heatmap";
import { HabitRow } from "@/components/HabitRow";
import { PeopleIcon } from "@/components/icons";
import { useDropDraft } from "@/lib/dropDraft";

const CYCLE_PRESETS: Array<{ label: string; days: number }> = [
  { label: "Daily", days: 1 },
  { label: "Every 2 days", days: 2 },
  { label: "Custom days", days: 0 },
];

const CUSTOM_CYCLE_SENTINEL = 0;

const WEEKDAYS: Array<{ label: string; day: number }> = [
  { label: "Mo", day: 1 },
  { label: "Tu", day: 2 },
  { label: "We", day: 3 },
  { label: "Th", day: 4 },
  { label: "Fr", day: 5 },
  { label: "Sa", day: 6 },
  { label: "Su", day: 0 },
];

const BAR_SLIDE_DIST = 200;
const SHEET_SLIDE_DIST = 600;

export default function Today() {
  const me = useQuery(api.profiles.me);
  const stats = useQuery(api.userStats.forCaller, {});
  const heatmapData = useQuery(api.drops.heatmapForProfile, me ? { profileId: me._id } : "skip");
  const dueHabits = useQuery(api.habits.dueToday, {});
  const allHabits = useQuery(api.habits.list, {});
  const createHabit = useMutation(api.habits.create);
  const archiveHabit = useMutation(api.habits.archive);
  const startDropDraft = useDropDraft((s) => s.start);
  const pendingFriends = useQuery(api.friendships.listForUser, { status: "pending" });
  const incomingCount = (pendingFriends ?? []).filter((r) => !r.iAmRequester).length;

  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftCycle, setDraftCycle] = useState<number>(1);
  const [draftCustomDays, setDraftCustomDays] = useState<number[]>([1]);
  const [draftColor, setDraftColor] = useState<string>(habitColors[0]);
  const [busy, setBusy] = useState(false);

  const textInputRef = useRef<TextInput>(null);
  const sheetAnim = useSharedValue(0);

  const [selectedHabitId, setSelectedHabitId] = useState<Id<"habits"> | null>(null);
  // 0 = no habit selected (cumulative card + bottom bar shown),
  // 1 = a habit is selected (habit card + action bar shown). Drives every
  // selection transition on the UI thread via Reanimated worklets.
  const selectionAnim = useSharedValue(0);

  // Synchronous guard against rapid repeated taps stacking duplicate screens.
  // Lock is cleared when Today regains focus (user navigated back) — more robust
  // than a fixed timeout, which would allow a second push if taps span > 600ms.
  const navLockRef = useRef(false);
  const navLockAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      // Clear the lock when Today genuinely regains focus (user navigated back),
      // but ignore the transient focus event Android's native-stack fires on the
      // previous screen *during* a card slide-in — that arrives within a few
      // hundred ms of the push and would otherwise reset the lock mid tap-burst,
      // letting a second tap stack a duplicate screen (Android-only; iOS doesn't
      // emit it). A real return is always well after this window.
      if (Date.now() - navLockAtRef.current > 500) navLockRef.current = false;
    }, []),
  );
  const navigateOnce = (href: Parameters<typeof router.push>[0]) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    navLockAtRef.current = Date.now();
    router.push(href);
    // Safety fallback so the button can never get permanently stuck if the
    // focus-based reset is somehow missed.
    setTimeout(() => {
      navLockRef.current = false;
    }, 800);
  };

  const habitHeatmapData = useQuery(
    api.drops.heatmapForHabit,
    selectedHabitId ? { habitId: selectedHabitId } : "skip",
  );

  const selectedHabit = useMemo(
    () => allHabits?.find((h) => h._id === selectedHabitId) ?? null,
    [allHabits, selectedHabitId],
  );

  // Pre-mount the habit-card overlay and HabitActionBar with a placeholder habit
  // (off-screen, hidden via the same `selectionAnim`-driven transforms/opacity) so
  // their layout is already settled before the user ever taps a habit. This lets
  // selectHabit start the show animation immediately, matching the hide animation,
  // instead of waiting for a freshly-mounted view to lay itself out.
  const displayHabit = selectedHabitId === null ? (allHabits?.[0] ?? null) : selectedHabit;

  // null while the habit's heatmap query is still loading — keep it distinct from
  // a real total of 0 so the UI can withhold the number instead of flashing "0"
  // before the correct count lands (COM-122).
  const habitTotalDrops = useMemo(
    () => (habitHeatmapData ? habitHeatmapData.reduce((sum, e) => sum + e.total, 0) : null),
    [habitHeatmapData],
  );

  // Bottom bar slides down out of view as a habit is selected; the action bar
  // slides up into its place. Derived on the UI thread and handed to BottomBar
  // as a shared value so it stays decoupled from BAR_SLIDE_DIST.
  const bottomBarTranslateY = useDerivedValue(() => selectionAnim.value * BAR_SLIDE_DIST);

  const sheetBackdropStyle = useAnimatedStyle(() => ({
    opacity: sheetAnim.value,
  }));

  const sheetSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sheetAnim.value, [0, 1], [SHEET_SLIDE_DIST, 0]) }],
  }));

  const openAddSheet = () => {
    // Start the Reanimated worklet before the state update, same as
    // selectHabit below — otherwise the setShowAdd re-render can delay when
    // the slide-up animation actually starts on Android.
    sheetAnim.value = withTiming(1, { duration: 220 });
    setShowAdd(true);
    setTimeout(() => textInputRef.current?.focus(), 80);
  };

  const closeAddSheet = () => {
    textInputRef.current?.blur();
    sheetAnim.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(setShowAdd)(false);
    });
  };

  const hideSelection = () => {
    selectionAnim.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(setSelectedHabitId)(null);
    });
  };

  const selectHabit = (id: Id<"habits">) => {
    if (selectedHabitId === id) {
      hideSelection();
    } else if (selectedHabitId !== null) {
      setSelectedHabitId(id);
    } else {
      // Reanimated runs this animation as a worklet on the UI thread, so it starts
      // immediately regardless of when the (heavier) setSelectedHabitId re-render
      // lands — no bridge "start" command to queue behind native UI updates. This
      // is exactly the class of Android-only lag the migration away from Animated
      // was meant to remove (see COM-107 / COM-114), so ordering no longer matters.
      selectionAnim.value = withTiming(1, { duration: 220 });
      setSelectedHabitId(id);
    }
  };

  const deselectHabit = hideSelection;

  const sections = useMemo(() => {
    if (!dueHabits || !allHabits) return [];
    const dueIds = new Set(dueHabits.map((h) => h._id));
    const notDue = allHabits.filter((h) => !dueIds.has(h._id));
    return [
      { title: "Due today", data: dueHabits },
      { title: "Not due today", data: notDue },
    ].filter((s) => s.data.length > 0);
  }, [dueHabits, allHabits]);

  // FlashList recycles a single flat array, so the SectionList's sections are
  // flattened into typed `header`/`row` entries. `firstInSection` lets each row
  // draw its own top separator (replacing ItemSeparatorComponent) without one
  // appearing directly under a section header.
  const listData = useMemo(
    () =>
      sections.flatMap((section) => [
        { kind: "header" as const, key: `header:${section.title}`, title: section.title },
        ...section.data.map((habit, i) => ({
          kind: "row" as const,
          key: habit._id,
          habit,
          sectionTitle: section.title,
          firstInSection: i === 0,
        })),
      ]),
    [sections],
  );

  // Magnetic "pull back to top" for the default Today view (COM-115): the whole screen
  // content (header + heatmap + rows, wrapped in one pulled Animated.View) is dragged
  // as a unit and springs back. A gesture-handler Pan drives a Reanimated translateY on
  // the UI thread; FlashList's own scroll is disabled here (the pull handles movement)
  // and re-enabled when a habit is selected, where this gesture is off.
  const isDefaultView = selectedHabitId === null;
  const pullY = useSharedValue(0);
  const pullGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDefaultView)
        // Only take over for clear vertical drags; horizontal yields to the row
        // Swipeables and a still finger yields to row taps.
        .activeOffsetY([-12, 12])
        .failOffsetX([-12, 12])
        .onUpdate((e) => {
          "worklet";
          // Resistance factor keeps the list feeling tethered to the top.
          pullY.value = e.translationY * 0.4;
        })
        .onFinalize(() => {
          "worklet";
          pullY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
        }),
    [isDefaultView, pullY],
  );
  const pullStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pullY.value }] }));

  const onAdd = async () => {
    const text = draftText.trim();
    if (!text || busy) return;
    if (draftCycle === CUSTOM_CYCLE_SENTINEL && draftCustomDays.length === 0) return;
    setBusy(true);
    try {
      const isCustom = draftCycle === CUSTOM_CYCLE_SENTINEL;
      await createHabit({
        text,
        cycleDays: isCustom ? 1 : draftCycle,
        customDays: isCustom ? draftCustomDays : undefined,
        color: draftColor,
      });
      setDraftText("");
      setDraftCycle(1);
      setDraftCustomDays([1]);
      setDraftColor(habitColors[0]);
      closeAddSheet();
    } finally {
      setBusy(false);
    }
  };

  if (dueHabits === undefined || allHabits === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.text.primary} />
      </View>
    );
  }

  const isEmpty = allHabits.length === 0;
  const atMax = allHabits.length >= 3;

  const statsArea = (
    <StatsArea
      stats={stats}
      cumulativeHeatmapData={heatmapData ?? []}
      habitHeatmapData={habitHeatmapData}
      displayHabit={displayHabit}
      habitTotalDrops={habitTotalDrops}
      timezone={me?.timezone ?? "UTC"}
      selectionAnim={selectionAnim}
      isHabitSelected={selectedHabitId !== null}
    />
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Everything (header + heatmap + rows) lives in one pulled layer that
          translates together and springs back — a magnetic overscroll bounce. Because
          nothing overlaps anything else, there's no cross-layer z-order/z-fighting to
          fight on Android (which is why earlier "heatmap covers the fixed header"
          attempts failed). */}
      <GestureDetector gesture={pullGesture}>
        <Animated.View style={[styles.pullContainer, pullStyle]}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Today</Text>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => navigateOnce("/friends")}
                  style={({ pressed }) => [styles.friendsButton, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  <PeopleIcon size={18} color={theme.text.primary} />
                  {incomingCount > 0 ? <View style={styles.badge} /> : null}
                </Pressable>
                <Pressable
                  onPress={() => me?.username && navigateOnce(`/u/${me.username}`)}
                  style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  {me?.avatarUrl ? (
                    <Image
                      source={{ uri: me.avatarUrl }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarLetter}>
                        {me?.username?.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {isEmpty
                ? "Add the first thing you want to keep doing."
                : dueHabits.length === 0
                  ? "Nothing due today. Come back tomorrow."
                  : `${dueHabits.length} ${dueHabits.length === 1 ? "habit" : "habits"} due`}
            </Text>
          </View>

          {isEmpty ? (
            <ScrollView
              contentContainerStyle={styles.emptyScroll}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            >
              {statsArea}
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Quiet start.</Text>
                <Text style={styles.emptyHint}>Tap + to commit to your first habit.</Text>
              </View>
            </ScrollView>
          ) : (
            <FlashList
              data={listData}
              keyExtractor={(item) => item.key}
              getItemType={(item) => item.kind}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isDefaultView}
              ListHeaderComponent={statsArea}
              renderItem={({ item }) => {
                if (item.kind === "header") {
                  return (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{item.title.toUpperCase()}</Text>
                    </View>
                  );
                }
                const habit = item.habit;
                const doneToday =
                  item.sectionTitle === "Not due today" && habit.lastDropDayKey !== undefined;
                return (
                  <>
                    {item.firstInSection ? null : <View style={styles.sep} />}
                    <Swipeable
                      renderRightActions={() => (
                        <View style={styles.archiveAction}>
                          <Text style={styles.archiveText}>Archive</Text>
                        </View>
                      )}
                      onSwipeableRightOpen={() => {
                        void archiveHabit({ habitId: habit._id });
                      }}
                      rightThreshold={48}
                      friction={1.6}
                    >
                      <HabitRow
                        text={habit.text}
                        cycleDays={habit.cycleDays}
                        customDays={habit.customDays}
                        color={habit.color}
                        doneToday={doneToday}
                        onPress={() => selectHabit(habit._id)}
                        onLongPress={() => {
                          startDropDraft(habit._id);
                          router.push("/drop/camera");
                        }}
                      />
                    </Swipeable>
                  </>
                );
              }}
              contentContainerStyle={styles.list}
            />
          )}
        </Animated.View>
      </GestureDetector>

      <BottomBar
        onAdd={openAddSheet}
        disabled={atMax}
        hint={atMax ? "Max. 3 habits. Archive one to add a new one." : undefined}
        translateY={bottomBarTranslateY}
      />

      {displayHabit && (
        <HabitActionBar
          habit={displayHabit}
          selectionAnim={selectionAnim}
          isVisible={selectedHabitId !== null}
          onDrop={() => {
            startDropDraft(displayHabit._id);
            router.push("/drop/camera");
          }}
          onViewDrops={() => router.push(`/(app)/habit/drops/${displayHabit._id}`)}
          onClose={deselectHabit}
        />
      )}

      {/* Sheet overlay — always mounted so the Reanimated animation starts on the UI
          thread before any JS-side mounting work, eliminating the Android lag */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents={showAdd ? "auto" : "none"}>
        <Animated.View style={[styles.overlayBackdrop, sheetBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeAddSheet} />
        </Animated.View>
        <KeyboardAvoidingView style={styles.overlayKAV} behavior="padding" pointerEvents="box-none">
          <Animated.View style={[styles.sheet, sheetSlideStyle]}>
            <Text style={styles.sheetTitle}>New commitment</Text>

            <TextInput
              ref={textInputRef}
              style={styles.input}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What do you want to keep doing?"
              placeholderTextColor={theme.text.muted}
              maxLength={280}
              multiline
            />

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
            {draftCycle === CUSTOM_CYCLE_SENTINEL && (
              <View style={styles.dayRow}>
                {WEEKDAYS.map(({ label, day }) => {
                  const active = draftCustomDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() =>
                        setDraftCustomDays((prev) =>
                          active ? prev.filter((d) => d !== day) : [...prev, day],
                        )
                      }
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {habitColors.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraftColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    draftColor === color && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.sheetButtons}>
              <Pressable style={styles.cancel} onPress={closeAddSheet}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.add,
                  (!draftText.trim() ||
                    busy ||
                    (draftCycle === CUSTOM_CYCLE_SENTINEL && draftCustomDays.length === 0)) &&
                    styles.addDisabled,
                ]}
                onPress={() => void onAdd()}
                disabled={
                  !draftText.trim() ||
                  busy ||
                  (draftCycle === CUSTOM_CYCLE_SENTINEL && draftCustomDays.length === 0)
                }
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const HEATMAP_COLS = 22;
const CARD_MARGIN_H = 16;
const CARD_PADDING_H = 16;

type HeatmapEntry = { dayKey: string; total: number; habits: { habitId: string; color: string }[] };
type HabitLike = {
  _id: Id<"habits">;
  text: string;
  cycleDays: number;
  customDays?: number[];
  lastDropDayKey?: string;
};

function StatsArea({
  stats,
  cumulativeHeatmapData,
  habitHeatmapData,
  displayHabit,
  habitTotalDrops,
  timezone,
  selectionAnim,
  isHabitSelected,
}: {
  stats: { streak: number; totalDrops: number } | null | undefined;
  cumulativeHeatmapData: HeatmapEntry[];
  habitHeatmapData: HeatmapEntry[] | undefined;
  displayHabit: HabitLike | null;
  habitTotalDrops: number | null;
  timezone: string;
  selectionAnim: SharedValue<number>;
  isHabitSelected: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const heatmapWidth = screenWidth - CARD_MARGIN_H * 2 - CARD_PADDING_H * 2;
  const streak = stats?.streak ?? 0;
  const drops = stats?.totalDrops ?? 0;

  const cumulativeStyle = useAnimatedStyle(() => ({ opacity: 1 - selectionAnim.value }));
  const habitCardStyle = useAnimatedStyle(() => ({ opacity: selectionAnim.value }));

  return (
    <View style={styles.statsSection}>
      <View>
        <Animated.View
          style={cumulativeStyle}
          pointerEvents={isHabitSelected ? "none" : "box-none"}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderLabel}>YOUR COMMITMENT</Text>
            </View>
            <Heatmap
              data={cumulativeHeatmapData}
              timezone={timezone}
              width={heatmapWidth}
              cols={HEATMAP_COLS}
              paddingH={0}
            />
            <View style={styles.statsLine}>
              <View style={styles.statBlock}>
                <Text style={styles.statBigValue}>{drops}</Text>
                <Text style={styles.statBigLabel}>
                  {drops === 1 ? "TOTAL DROP" : "TOTAL DROPS"}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statBigValue}>{streak}</Text>
                <Text style={styles.statBigLabel}>DAY STREAK</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {displayHabit && (
          <Animated.View
            style={[{ position: "absolute", left: 0, right: 0, top: 0 }, habitCardStyle]}
            pointerEvents="none"
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderLabel} numberOfLines={1}>
                  {displayHabit.text.toUpperCase()}
                </Text>
              </View>
              <Heatmap
                data={habitHeatmapData ?? []}
                timezone={timezone}
                width={heatmapWidth}
                cols={HEATMAP_COLS}
                paddingH={0}
              />
              <View style={styles.statsLine}>
                <View style={styles.statBlock}>
                  <Text style={styles.statBigValue}>{habitTotalDrops ?? "—"}</Text>
                  <Text style={styles.statBigLabel}>
                    {habitTotalDrops === 1 ? "TOTAL DROP" : "TOTAL DROPS"}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statBigValue} numberOfLines={1}>
                    {displayHabit.lastDropDayKey ?? "—"}
                  </Text>
                  <Text style={styles.statBigLabel}>LAST DROP</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function HabitActionBar({
  habit,
  selectionAnim,
  isVisible,
  onDrop,
  onViewDrops,
  onClose,
}: {
  habit: HabitLike;
  selectionAnim: SharedValue<number>;
  isVisible: boolean;
  onDrop: () => void;
  onViewDrops: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  // Slides up from off-screen (BAR_SLIDE_DIST) to rest (0) as selection completes.
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(selectionAnim.value, [0, 1], [BAR_SLIDE_DIST, 0]) }],
  }));
  return (
    <Animated.View
      style={[styles.habitActionBar, { paddingBottom: insets.bottom + 12 }, slideStyle]}
      pointerEvents={isVisible ? "box-none" : "none"}
    >
      <View style={styles.habitBarHeader}>
        <Text style={styles.habitBarTitle} numberOfLines={1}>
          {habit.text}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [styles.habitBarClose, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.habitBarCloseText}>✕</Text>
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [styles.dropBtn, pressed && { opacity: 0.7 }]}
        onPress={onDrop}
      >
        <Text style={styles.dropBtnText}>Drop on this habit</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.viewDropsBtn, pressed && { opacity: 0.6 }]}
        onPress={onViewDrops}
        hitSlop={8}
      >
        <Text style={styles.viewDropsText}>View habit drops</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: "center", justifyContent: "center" },
  // Wraps the whole screen content so it can be pulled/sprung as one unit.
  pullContainer: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  avatarButton: {},
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  friendsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.blockElevated,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.blockElevated },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  title: {
    color: theme.text.primary,
    fontSize: 36,
    fontFamily: fonts.sans,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 4,
  },
  statsSection: { paddingBottom: 8 },
  card: {
    marginHorizontal: CARD_MARGIN_H,
    paddingHorizontal: CARD_PADDING_H,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: theme.blockElevated,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderHairline,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardHeaderLabel: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1.4,
    flex: 1,
  },
  statsLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 18,
  },
  statBlock: {
    alignItems: "center",
    flex: 1,
  },
  statBigValue: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  statBigLabel: {
    color: theme.text.tertiary,
    fontSize: 10,
    fontFamily: fonts.mono,
    letterSpacing: 1.4,
    marginTop: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: theme.divide,
    marginVertical: 4,
  },
  habitActionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.borderHairline,
  },
  habitBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  habitBarTitle: {
    flex: 1,
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  habitBarClose: {
    paddingLeft: 12,
  },
  habitBarCloseText: {
    color: theme.text.tertiary,
    fontSize: 18,
    fontFamily: fonts.sans,
  },
  dropBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.text.primary,
    alignItems: "center",
  },
  dropBtnText: { color: theme.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "700" },
  viewDropsBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewDropsText: {
    color: theme.text.tertiary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
  emptyScroll: { flexGrow: 1, paddingBottom: 120 },
  list: { paddingBottom: 180 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: {
    color: theme.text.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  sep: { height: 1, backgroundColor: theme.divide, marginLeft: 56 },
  archiveAction: {
    backgroundColor: "#1a0e0e",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: "#3a1414",
  },
  archiveText: {
    color: "#ff8a8a",
    fontSize: 13,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  emptyHint: {
    color: theme.text.tertiary,
    fontSize: 14,
    fontFamily: fonts.sans,
    marginTop: 8,
    textAlign: "center",
  },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayKAV: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0e0e0e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
    textAlignVertical: "top",
  },
  fieldLabel: {
    color: theme.text.tertiary,
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dayRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.borderHairline,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: { backgroundColor: theme.text.primary, borderColor: theme.text.primary },
  dayChipText: {
    color: theme.text.secondary,
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
  },
  dayChipTextActive: { color: theme.bg },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 2.5, borderColor: "#ffffff" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.borderHairline,
  },
  chipActive: { backgroundColor: theme.text.primary, borderColor: theme.text.primary },
  chipText: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
  },
  chipTextActive: { color: theme.bg },
  sheetButtons: { flexDirection: "row", gap: 8, marginTop: 24 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.borderHairline,
    alignItems: "center",
  },
  cancelText: { color: theme.text.secondary, fontSize: 16, fontFamily: fonts.sans },
  add: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.text.primary,
    alignItems: "center",
  },
  addDisabled: { opacity: 0.4 },
  addText: { color: theme.bg, fontSize: 16, fontFamily: fonts.sans, fontWeight: "600" },
});
