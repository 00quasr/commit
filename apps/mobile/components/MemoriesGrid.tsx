import type { Doc } from "@commit/convex/dataModel";
import { dayKeyInTimezone } from "@commit/domain";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EnrichedDrop {
  drop: Doc<"drops">;
  photoUrl: string | null;
}

interface MemoriesGridProps {
  drops: EnrichedDrop[];
  timezone: string;
  onViewAll: () => void;
  onTileTap?: (dayKey: string) => void;
}

function buildLast14Days(timezone: string): string[] {
  const now = Date.now();
  const keys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    keys.push(dayKeyInTimezone(now - i * 86_400_000, timezone));
  }
  // Deduplicate while preserving order (DST edge case)
  return [...new Set(keys)];
}

export function MemoriesGrid({ drops, timezone, onViewAll, onTileTap }: MemoriesGridProps) {
  const today = dayKeyInTimezone(Date.now(), timezone);
  const days = buildLast14Days(timezone);

  const dropsByDay = new Map<string, EnrichedDrop>();
  for (const item of drops) {
    if (!dropsByDay.has(item.drop.dayKey)) {
      dropsByDay.set(item.drop.dayKey, item);
    }
  }

  const row1 = days.slice(0, 7);
  const row2 = days.slice(7);

  const renderTile = (dayKey: string) => {
    const item = dropsByDay.get(dayKey);
    const isToday = dayKey === today;
    const dayNum = parseInt(dayKey.split("-")[2] ?? "0", 10);

    return (
      <Pressable
        key={dayKey}
        style={({ pressed }) => [styles.tile, item && pressed && { opacity: 0.7 }]}
        onPress={item && onTileTap ? () => onTileTap(dayKey) : undefined}
      >
        {item?.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={[StyleSheet.absoluteFillObject, styles.tilePhoto]}
            contentFit="cover"
          />
        ) : null}
        <View style={[styles.numCircle, isToday && styles.numCircleToday]}>
          <Text style={[styles.numText, isToday && styles.numTextToday]}>{dayNum}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔒 Your Memories</Text>
        <Text style={styles.headerMeta}>Only visible to you.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Last 14 days</Text>
        <View style={styles.row}>{row1.map(renderTile)}</View>
        <View style={styles.row}>{row2.map(renderTile)}</View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.6 }]}
        onPress={onViewAll}
      >
        <Text style={styles.viewAllText}>View all my Memories</Text>
      </Pressable>
    </View>
  );
}

const TILE_RADIUS = 10;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  headerMeta: {
    color: theme.text.muted,
    fontSize: 12,
    fontFamily: fonts.sans,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardLabel: {
    color: theme.text.muted,
    fontSize: 10,
    fontFamily: fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: TILE_RADIUS,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tilePhoto: {
    borderRadius: TILE_RADIUS,
  },
  numCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  numCircleToday: {
    backgroundColor: "#fff",
  },
  numText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: fonts.mono,
    fontWeight: "600",
  },
  numTextToday: {
    color: "#000",
  },
  viewAllBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  viewAllText: {
    color: theme.text.secondary,
    fontSize: 13,
    fontFamily: fonts.sans,
    fontWeight: "500",
  },
});
