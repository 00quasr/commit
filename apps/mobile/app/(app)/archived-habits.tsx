import { api } from "@commit/convex/api";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function cycleLabel(cycleDays: number): string {
  if (cycleDays === 1) return "daily";
  if (cycleDays === 2) return "every 2 days";
  if (cycleDays === 7) return "weekly";
  return `every ${cycleDays} days`;
}

function deleteOnLabel(scheduledDeleteAt: number): string {
  const date = new Date(scheduledDeleteAt);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ArchivedHabits() {
  const activeHabits = useQuery(api.habits.list);
  const archivedHabits = useQuery(api.habits.listArchived);
  const unarchive = useMutation(api.habits.unarchive);
  const scheduleDelete = useMutation(api.habits.scheduleDelete);
  const cancelScheduledDelete = useMutation(api.habits.cancelScheduledDelete);

  const atLimit = (activeHabits?.length ?? 0) >= 3;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Habit Archive</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>✕</Text>
        </Pressable>
      </View>

      {archivedHabits === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {atLimit && archivedHabits.length > 0 && (
            <Text style={styles.limitHint}>Archive an active habit to reactivate one.</Text>
          )}
          {archivedHabits.length === 0 ? (
            <Text style={styles.emptyHint}>No archived habits yet.</Text>
          ) : (
            archivedHabits.map((habit) => {
              const accent = habit.color ?? theme.text.muted;
              const pendingDelete = habit.scheduledDeleteAt !== undefined;
              return (
                <View
                  key={habit._id}
                  style={[styles.row, pendingDelete && styles.rowPendingDelete]}
                >
                  <View style={[styles.colorDot, { backgroundColor: accent }]} />
                  <View style={styles.body}>
                    <Text
                      style={[styles.habitText, pendingDelete && styles.habitTextPendingDelete]}
                      numberOfLines={2}
                    >
                      {habit.text}
                    </Text>
                    {pendingDelete ? (
                      <Text style={styles.deleteCountdown}>
                        Deletes on {deleteOnLabel(habit.scheduledDeleteAt!)}
                      </Text>
                    ) : (
                      <Text style={styles.meta}>
                        {cycleLabel(habit.cycleDays)} ·{" "}
                        <Text style={habit.dropCount === 0 ? styles.metaZero : undefined}>
                          {habit.dropCount} drops
                        </Text>
                      </Text>
                    )}
                  </View>
                  {pendingDelete ? (
                    <Pressable
                      style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
                      onPress={() => void cancelScheduledDelete({ habitId: habit._id })}
                    >
                      <Text style={styles.cancelBtnText}>Undo</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.actions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.reactivateBtn,
                          atLimit && styles.reactivateBtnDisabled,
                          pressed && !atLimit && { opacity: 0.6 },
                        ]}
                        onPress={atLimit ? undefined : () => void unarchive({ habitId: habit._id })}
                        disabled={atLimit}
                      >
                        <Text
                          style={[
                            styles.reactivateBtnText,
                            atLimit && styles.reactivateBtnTextDisabled,
                          ]}
                        >
                          Reactivate
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => void scheduleDelete({ habitId: habit._id })}
                      >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: fonts.sans,
    fontWeight: "700",
  },
  backButton: { padding: 4 },
  backText: { color: theme.text.tertiary, fontSize: 18 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  limitHint: {
    color: theme.text.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginBottom: 16,
  },
  emptyHint: {
    color: theme.text.muted,
    fontSize: 14,
    fontFamily: fonts.mono,
    marginTop: 32,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.divide,
  },
  rowPendingDelete: {
    opacity: 0.5,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: { flex: 1 },
  habitText: {
    color: theme.text.tertiary,
    fontSize: 16,
    fontFamily: fonts.sans,
    lineHeight: 21,
  },
  habitTextPendingDelete: {
    textDecorationLine: "line-through",
  },
  meta: {
    color: theme.text.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metaZero: {
    color: "#E05252",
  },
  deleteCountdown: {
    color: theme.text.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  reactivateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.text.tertiary,
  },
  reactivateBtnDisabled: {
    borderColor: theme.blockElevated,
  },
  reactivateBtnText: {
    color: theme.text.primary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  reactivateBtnTextDisabled: {
    color: theme.text.muted,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E05252",
  },
  deleteBtnText: {
    color: "#E05252",
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.text.muted,
  },
  cancelBtnText: {
    color: theme.text.muted,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
});
