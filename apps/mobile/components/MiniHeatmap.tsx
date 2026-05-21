import { dayKeyInTimezone } from "@commit/domain";
import type { Id } from "@commit/convex/dataModel";
import { StyleSheet, View } from "react-native";

const CELL = 8;
const GAP = 2;
const ROWS = 7;
const COLS = 26; // ~6 months

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
  habitId: Id<"habits">;
  color: string;
}

export interface MiniHeatmapProps {
  data: Array<{ dayKey: string; total: number; habits: HabitEntry[] }>;
  timezone: string;
}

export function MiniHeatmap({ data, timezone }: MiniHeatmapProps) {
  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const todayDow = dayOfWeekMonFirst(todayKey);
  const todayIndex = (COLS - 1) * ROWS + todayDow;
  const startKey = addDays(todayKey, -todayIndex);

  return (
    <View style={styles.grid}>
      {Array.from({ length: COLS }, (_, col) => (
        <View key={col} style={styles.column}>
          {Array.from({ length: ROWS }, (_, row) => {
            const idx = col * ROWS + row;
            if (idx > todayIndex) {
              return <View key={row} style={[styles.cell, { backgroundColor: "transparent" }]} />;
            }
            const dayKey = addDays(startKey, idx);
            const cell = byDay.get(dayKey);
            if (!cell || cell.total === 0) {
              return <View key={row} style={[styles.cell, { backgroundColor: EMPTY_COLOR }]} />;
            }
            if (cell.habits.length === 0) {
              return <View key={row} style={[styles.cell, { backgroundColor: ADHOC_COLOR }]} />;
            }
            if (cell.habits.length === 1) {
              return (
                <View key={row} style={[styles.cell, { backgroundColor: cell.habits[0]!.color }]} />
              );
            }
            return (
              <View key={row} style={[styles.cell, styles.splitCell]}>
                {cell.habits.map((h) => (
                  <View key={h.habitId} style={[styles.band, { backgroundColor: h.color }]} />
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: GAP, flexWrap: "nowrap" },
  column: { flexDirection: "column", gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 1.5, overflow: "hidden" },
  splitCell: { flexDirection: "column" },
  band: { flex: 1 },
});
