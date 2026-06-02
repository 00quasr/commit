import { api } from "@commit/convex/api";
import { dayKeyInTimezone } from "@commit/domain";
import { fonts } from "@commit/ui-tokens";
import { theme } from "@/lib/theme";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toPaddedKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface MonthSection {
  label: string;
  year: number;
  month: number;
  tiles: { dayKey: string; dayNum: number }[];
}

function buildMonthSections(createdAt: number, timezone: string, todayKey: string): MonthSection[] {
  const creationKey = dayKeyInTimezone(createdAt, timezone);
  const [cy, cm] = creationKey.split("-").map(Number) as [number, number];
  const [ty, tm] = todayKey.split("-").map(Number) as [number, number];

  const sections: MonthSection[] = [];

  for (let y = ty, mo = tm; y > cy || (y === cy && mo >= cm); ) {
    const totalDays = daysInMonth(y, mo - 1);
    const tiles: { dayKey: string; dayNum: number }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const key = toPaddedKey(y, mo - 1, d);
      if (key > todayKey) continue;
      if (key < creationKey) continue;
      tiles.push({ dayKey: key, dayNum: d });
    }
    if (tiles.length > 0) {
      sections.push({ label: `${MONTHS[mo - 1]} ${y}`, year: y, month: mo - 1, tiles });
    }
    mo--;
    if (mo === 0) {
      mo = 12;
      y--;
    }
  }

  return sections;
}

export default function Memories() {
  const me = useQuery(api.profiles.me);
  const thumbnails = useQuery(api.drops.memoryThumbnails, me ? { profileId: me._id } : "skip");

  const { sections, photoMap } = useMemo(() => {
    if (!me || !thumbnails) return { sections: [], photoMap: new Map<string, string | null>() };

    const todayKey = dayKeyInTimezone(Date.now(), me.timezone);
    const built = buildMonthSections(me.createdAt, me.timezone, todayKey);

    const map = new Map<string, string | null>();
    for (const t of thumbnails) {
      if (!map.has(t.dayKey)) map.set(t.dayKey, t.photoUrl);
    }

    return { sections: built, photoMap: map };
  }, [me, thumbnails]);

  if (!me || !thumbnails) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Text style={styles.backText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={theme.text.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Your Memories</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => {
          const rows: { dayKey: string; dayNum: number }[][] = [];
          for (let i = 0; i < section.tiles.length; i += 7) {
            rows.push(section.tiles.slice(i, i + 7));
          }

          return (
            <View key={`${section.year}-${section.month}`} style={styles.monthBlock}>
              <Text style={styles.monthLabel}>{section.label}</Text>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.row}>
                  {row.map(({ dayKey, dayNum }) => {
                    const photoUrl = photoMap.get(dayKey);
                    const hasPhoto = photoUrl != null;
                    return (
                      <Pressable
                        key={dayKey}
                        style={({ pressed }) => [
                          styles.tile,
                          pressed && hasPhoto && { opacity: 0.7 },
                        ]}
                        onPress={hasPhoto ? () => router.push(`/(app)/day/${dayKey}`) : undefined}
                      >
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={[StyleSheet.absoluteFillObject, styles.tilePhoto]}
                            contentFit="cover"
                          />
                        ) : null}
                        <Text style={[styles.dayNum, hasPhoto && styles.dayNumOnPhoto]}>
                          {dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {row.length < 7 &&
                    Array.from({ length: 7 - row.length }).map((_, i) => (
                      <View key={`pad-${i}`} style={styles.tilePad} />
                    ))}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const TILE_SIZE = 44;
const TILE_RADIUS = 8;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  monthBlock: { marginBottom: 28 },
  monthLabel: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tilePhoto: {
    borderRadius: TILE_RADIUS,
  },
  tilePad: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  dayNum: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontFamily: fonts.mono,
    fontWeight: "600",
  },
  dayNumOnPhoto: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
