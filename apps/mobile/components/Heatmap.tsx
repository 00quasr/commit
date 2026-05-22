import { dayKeyInTimezone } from "@commit/domain";
import { colors, fonts } from "@commit/ui-tokens";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

const GAP = 2;
const ROWS = 7;
const COLS = 26;
const PADDING_H = 20;

const EMPTY_COLOR = "#0e0e0e";
const ADHOC_COLOR = "#333333";

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
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
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = (screenWidth - PADDING_H * 2 - (COLS - 1) * GAP) / COLS;

  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const totalCells = ROWS * COLS;
  const startKey = addDays(todayKey, -(totalCells - 1));

  const columns: Array<Array<{ dayKey: string; total: number; habits: HabitEntry[] }>> = [];
  for (let col = 0; col < COLS; col++) {
    const week: Array<{ dayKey: string; total: number; habits: HabitEntry[] }> = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = col * ROWS + row;
      const dayKey = addDays(startKey, idx);
      week.push(byDay.get(dayKey) ?? { dayKey, total: 0, habits: [] });
    }
    columns.push(week);
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const cellStyle = { width: cellSize, height: cellSize, borderRadius: Math.max(1, cellSize / 4) };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{total} drops in the last 6 months</Text>
      <View style={styles.grid}>
        {columns.map((week, ci) => (
          <View key={ci} style={styles.column}>
            {week.map((cell, ri) => {
              if (cell.habits.length === 0) {
                const bg = cell.total > 0 ? ADHOC_COLOR : EMPTY_COLOR;
                return <View key={ri} style={[cellStyle, { backgroundColor: bg }]} />;
              }
              return (
                <View key={ri} style={[cellStyle, styles.splitCell]}>
                  {cell.habits.map((h) => (
                    <View key={h.habitId} style={[styles.band, { backgroundColor: h.color }]} />
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: PADDING_H },
  title: { color: colors.fg, fontSize: 14, fontFamily: fonts.mono, marginBottom: 12 },
  grid: { flexDirection: "row", gap: GAP },
  column: { flexDirection: "column", gap: GAP },
  splitCell: { flexDirection: "column", overflow: "hidden" },
  band: { flex: 1 },
});
