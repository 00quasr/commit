import { dayKeyInTimezone } from "@commit/domain";
import { colors, fonts } from "@commit/ui-tokens";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const CELL = 11;
const GAP = 2;
const ROWS = 7; // Mon-Sun
const COLS = 53;

const EMPTY_COLOR = "#0e0e0e";
const ADHOC_COLOR = "#333333";

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

function dayOfWeekMonFirst(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (dt.getUTCDay() + 6) % 7;
}

interface HabitEntry {
  habitId: string;
  color: string;
}

export interface HeatmapProps {
  data: Array<{ dayKey: string; total: number; habits: HabitEntry[] }>;
  timezone: string;
}

export function Heatmap({ data, timezone }: HeatmapProps) {
  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const todayDow = dayOfWeekMonFirst(todayKey);
  const todayIndex = (COLS - 1) * ROWS + todayDow;
  const startOffset = -todayIndex;
  const startKey = addDays(todayKey, startOffset);

  const columns: Array<Array<{ dayKey: string; total: number; habits: HabitEntry[] }>> = [];
  for (let col = 0; col < COLS; col++) {
    const week: Array<{ dayKey: string; total: number; habits: HabitEntry[] }> = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = col * ROWS + row;
      if (idx > todayIndex) {
        week.push({ dayKey: "", total: -1, habits: [] });
      } else {
        const dayKey = addDays(startKey, idx);
        week.push(byDay.get(dayKey) ?? { dayKey, total: 0, habits: [] });
      }
    }
    columns.push(week);
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{total} drops in the last year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.grid}>
          {columns.map((week, ci) => (
            <View key={ci} style={styles.column}>
              {week.map((cell, ri) => {
                if (cell.total < 0) {
                  return <View key={ri} style={[styles.cell, { backgroundColor: "transparent" }]} />;
                }
                if (cell.habits.length === 0) {
                  // No drops or only ad-hoc drops
                  const bg = cell.total > 0 ? ADHOC_COLOR : EMPTY_COLOR;
                  return <View key={ri} style={[styles.cell, { backgroundColor: bg }]} />;
                }
                // Split cell: one horizontal band per habit
                return (
                  <View key={ri} style={[styles.cell, styles.splitCell]}>
                    {cell.habits.map((h) => (
                      <View key={h.habitId} style={[styles.band, { backgroundColor: h.color }]} />
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  title: { color: colors.fg, fontSize: 14, fontFamily: fonts.mono, marginBottom: 12 },
  scroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  grid: { flexDirection: "row", gap: GAP },
  column: { flexDirection: "column", gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 2, overflow: "hidden" },
  splitCell: { flexDirection: "column" },
  band: { flex: 1 },
});
