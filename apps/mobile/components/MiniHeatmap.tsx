import { dayKeyInTimezone } from "@commit/domain";
import type { Id } from "@commit/convex/dataModel";
import { StyleSheet, View, useWindowDimensions } from "react-native";

const GAP = 2;
const ROWS = 7;
const COLS = 26; // ~6 months
const PADDING_H = 20;

const EMPTY_COLOR = "#0e0e0e";
const ADHOC_COLOR = "#333333";

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
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
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = (screenWidth - PADDING_H * 2 - (COLS - 1) * GAP) / COLS;

  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const totalCells = ROWS * COLS;
  const todayIndex = totalCells - 1;
  const startKey = addDays(todayKey, -(totalCells - 1));

  const cellStyle = { width: cellSize, height: cellSize, borderRadius: Math.max(1, cellSize / 4) };

  return (
    <View style={styles.grid}>
      {Array.from({ length: COLS }, (_, col) => (
        <View key={col} style={styles.column}>
          {Array.from({ length: ROWS }, (_, row) => {
            const idx = col * ROWS + row;
            if (idx > todayIndex) {
              return <View key={row} style={[cellStyle, { backgroundColor: "transparent" }]} />;
            }
            const dayKey = addDays(startKey, idx);
            const cell = byDay.get(dayKey);
            if (!cell || cell.total === 0) {
              return <View key={row} style={[cellStyle, { backgroundColor: EMPTY_COLOR }]} />;
            }
            if (cell.habits.length === 0) {
              return <View key={row} style={[cellStyle, { backgroundColor: ADHOC_COLOR }]} />;
            }
            if (cell.habits.length === 1) {
              return (
                <View key={row} style={[cellStyle, { backgroundColor: cell.habits[0]!.color }]} />
              );
            }
            return (
              <View key={row} style={[cellStyle, styles.splitCell]}>
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
  splitCell: { flexDirection: "column", overflow: "hidden" },
  band: { flex: 1 },
});
