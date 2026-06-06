import type { Doc, Id } from "@commit/convex/dataModel";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ActivityEventCardProps {
  event: {
    _id: Id<"activityEvents">;
    kind: "habit_created" | "streak_milestone";
    createdAt: number;
    author: Doc<"profiles">;
    habit: {
      habitId: Id<"habits">;
      text: string;
      color: string | null;
      cycleDays?: number;
    } | null;
    streak: number | null;
  };
}

function cycleLabel(days?: number): string | null {
  if (!days) return null;
  if (days === 1) return "daily";
  if (days === 7) return "weekly";
  return `every ${days} days`;
}

export function ActivityEventCard({ event }: ActivityEventCardProps) {
  const onTap = () => router.push(`/u/${event.author.username}`);

  return (
    <Pressable onPress={onTap} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      {event.author.avatarUrl ? (
        <Image source={{ uri: event.author.avatarUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarLetter}>{event.author.username.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {event.habit?.color ? (
        <View style={[styles.colorTab, { backgroundColor: event.habit.color }]} />
      ) : null}
      <View style={styles.body}>
        {event.kind === "habit_created" ? (
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.name}>{event.author.username}</Text>
            <Text style={styles.muted}> started </Text>
            <Text style={styles.emph}>{event.habit?.text ?? "a habit"}</Text>
            {event.habit?.cycleDays ? (
              <Text style={styles.muted}> · {cycleLabel(event.habit.cycleDays)}</Text>
            ) : null}
          </Text>
        ) : (
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.name}>{event.author.username}</Text>
            <Text style={styles.muted}> hit a </Text>
            <Text style={styles.emph}>{event.streak ?? 0}-day streak</Text>
            {event.habit ? (
              <>
                <Text style={styles.muted}> on </Text>
                <Text style={styles.emph}>{event.habit.text}</Text>
              </>
            ) : null}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: theme.blockElevated,
    borderRadius: 12,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.blockGlass },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: {
    color: theme.text.primary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  colorTab: { width: 3, height: 28, borderRadius: 2, alignSelf: "center" },
  body: { flex: 1 },
  line: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  name: { color: theme.text.primary, fontWeight: "600" },
  emph: { color: theme.text.primary, fontWeight: "600" },
  muted: { color: theme.text.tertiary },
});
