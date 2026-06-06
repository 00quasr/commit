import { api } from "@commit/convex/api";
import type { Id } from "@commit/convex/dataModel";
import { fonts, habitColors } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useMemo, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
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

  const [selectedHabitId, setSelectedHabitId] = useState<Id<"habits"> | null>(null);
  const selectionAnim = useRef(new Animated.Value(0)).current;

  const habitHeatmapData = useQuery(
    api.drops.heatmapForHabit,
    selectedHabitId ? { habitId: selectedHabitId } : "skip",
  );

  const selectedHabit = useMemo(
    () => allHabits?.find((h) => h._id === selectedHabitId) ?? null,
    [allHabits, selectedHabitId],
  );

  const habitTotalDrops = useMemo(
    () => habitHeatmapData?.reduce((sum, e) => sum + e.total, 0) ?? 0,
    [habitHeatmapData],
  );

  const bottomBarTranslateY = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_SLIDE_DIST],
  });
  const actionBarTranslateY = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BAR_SLIDE_DIST, 0],
  });
  const cumulativeOpacity = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const habitCardOpacity = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const selectHabit = (id: Id<"habits">) => {
    if (selectedHabitId === id) {
      Animated.timing(selectionAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
        () => setSelectedHabitId(null),
      );
    } else if (selectedHabitId !== null) {
      setSelectedHabitId(id);
    } else {
      setSelectedHabitId(id);
      Animated.timing(selectionAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  };

  const deselectHabit = () => {
    Animated.timing(selectionAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
      setSelectedHabitId(null),
    );
  };

  const sections = useMemo(() => {
    if (!dueHabits || !allHabits) return [];
    const dueIds = new Set(dueHabits.map((h) => h._id));
    const notDue = allHabits.filter((h) => !dueIds.has(h._id));
    return [
      { title: "Due today", data: dueHabits },
      { title: "Not due today", data: notDue },
    ].filter((s) => s.data.length > 0);
  }, [dueHabits, allHabits]);

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
      setShowAdd(false);
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
      selectedHabit={selectedHabit}
      habitTotalDrops={habitTotalDrops}
      timezone={me?.timezone ?? "UTC"}
      cumulativeOpacity={cumulativeOpacity}
      habitCardOpacity={habitCardOpacity}
      isHabitSelected={selectedHabitId !== null}
    />
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Today</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/friends")}
              style={({ pressed }) => [styles.friendsButton, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <PeopleIcon size={18} color={theme.text.primary} />
              {incomingCount > 0 ? <View style={styles.badge} /> : null}
            </Pressable>
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              {me?.avatarUrl ? (
                <Image source={{ uri: me.avatarUrl }} style={styles.avatar} contentFit="cover" />
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
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          {statsArea}
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Quiet start.</Text>
            <Text style={styles.emptyHint}>Tap + to commit to your first habit.</Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={statsArea}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const doneToday =
              section.title === "Not due today" && item.lastDropDayKey !== undefined;
            return (
              <Swipeable
                renderRightActions={() => (
                  <View style={styles.archiveAction}>
                    <Text style={styles.archiveText}>Archive</Text>
                  </View>
                )}
                onSwipeableRightOpen={() => {
                  void archiveHabit({ habitId: item._id });
                }}
                rightThreshold={48}
                friction={1.6}
              >
                <HabitRow
                  text={item.text}
                  cycleDays={item.cycleDays}
                  customDays={item.customDays}
                  color={item.color}
                  doneToday={doneToday}
                  onPress={() => selectHabit(item._id)}
                  onLongPress={() => {
                    startDropDraft(item._id);
                    router.push("/drop/camera");
                  }}
                />
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <BottomBar
        onAdd={() => setShowAdd(true)}
        disabled={atMax}
        hint={atMax ? "Max. 3 habits. Archive one to add a new one." : undefined}
        translateY={bottomBarTranslateY}
      />

      {selectedHabit && (
        <HabitActionBar
          habit={selectedHabit}
          translateY={actionBarTranslateY}
          isVisible={selectedHabitId !== null}
          onDrop={() => {
            startDropDraft(selectedHabit._id);
            router.push("/drop/camera");
          }}
          onViewDrops={() => router.push(`/(app)/habit/drops/${selectedHabit._id}`)}
          onClose={deselectHabit}
        />
      )}

      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New commitment</Text>

            <TextInput
              style={styles.input}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What do you want to keep doing?"
              placeholderTextColor={theme.text.muted}
              autoFocus
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
              <Pressable style={styles.cancel} onPress={() => setShowAdd(false)}>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  selectedHabit,
  habitTotalDrops,
  timezone,
  cumulativeOpacity,
  habitCardOpacity,
  isHabitSelected,
}: {
  stats: { streak: number; totalDrops: number } | null | undefined;
  cumulativeHeatmapData: HeatmapEntry[];
  habitHeatmapData: HeatmapEntry[] | undefined;
  selectedHabit: HabitLike | null;
  habitTotalDrops: number;
  timezone: string;
  cumulativeOpacity: Animated.AnimatedInterpolation<number>;
  habitCardOpacity: Animated.AnimatedInterpolation<number>;
  isHabitSelected: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const heatmapWidth = screenWidth - CARD_MARGIN_H * 2 - CARD_PADDING_H * 2;
  const streak = stats?.streak ?? 0;
  const drops = stats?.totalDrops ?? 0;

  return (
    <View style={styles.statsSection}>
      <View>
        <Animated.View
          style={{ opacity: cumulativeOpacity }}
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
                <Text style={styles.statBigValue}>{streak}</Text>
                <Text style={styles.statBigLabel}>DAY STREAK</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statBigValue}>{drops}</Text>
                <Text style={styles.statBigLabel}>
                  {drops === 1 ? "TOTAL DROP" : "TOTAL DROPS"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {selectedHabit && (
          <Animated.View
            style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: habitCardOpacity }}
            pointerEvents="none"
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderLabel} numberOfLines={1}>
                  {selectedHabit.text.toUpperCase()}
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
                  <Text style={styles.statBigValue}>{habitTotalDrops}</Text>
                  <Text style={styles.statBigLabel}>
                    {habitTotalDrops === 1 ? "TOTAL DROP" : "TOTAL DROPS"}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statBigValue} numberOfLines={1}>
                    {selectedHabit.lastDropDayKey ?? "—"}
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
  translateY,
  isVisible,
  onDrop,
  onViewDrops,
  onClose,
}: {
  habit: HabitLike;
  translateY: Animated.AnimatedInterpolation<number>;
  isVisible: boolean;
  onDrop: () => void;
  onViewDrops: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      style={[
        styles.habitActionBar,
        { paddingBottom: insets.bottom + 12, transform: [{ translateY }] },
      ]}
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
    fontSize: 32,
    fontFamily: fonts.sans,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.8,
    lineHeight: 36,
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
