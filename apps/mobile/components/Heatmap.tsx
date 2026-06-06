import { dayKeyInTimezone } from "@commit/domain";
import { StyleSheet, View, useWindowDimensions } from "react-native";

const DEFAULT_GAP = 3;
const ROWS = 7;
const DEFAULT_COLS = 26;
const DEFAULT_PADDING_H = 20;

const EMPTY_COLOR = "#1a1a1a";
const ADHOC_COLOR = "#3a3a3a";

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
  width?: number;
  cols?: number;
  paddingH?: number;
  gap?: number;
}

export function Heatmap({
  data,
  timezone,
  width,
  cols = DEFAULT_COLS,
  paddingH = DEFAULT_PADDING_H,
  gap = DEFAULT_GAP,
}: HeatmapProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = width ?? screenWidth;
  const cellSize = (containerWidth - paddingH * 2 - (cols - 1) * gap) / cols;

  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const totalCells = ROWS * cols;
  const startKey = addDays(todayKey, -(totalCells - 1));

  const columns: Array<Array<{ dayKey: string; total: number; habits: HabitEntry[] }>> = [];
  for (let col = 0; col < cols; col++) {
    const week: Array<{ dayKey: string; total: number; habits: HabitEntry[] }> = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = col * ROWS + row;
      const dayKey = addDays(startKey, idx);
      week.push(byDay.get(dayKey) ?? { dayKey, total: 0, habits: [] });
    }
    columns.push(week);
  }

  const cellStyle = { width: cellSize, height: cellSize, borderRadius: Math.max(1, cellSize / 4) };

  return (
    <View style={[styles.wrap, { paddingHorizontal: paddingH }]}>
      <View style={[styles.grid, { gap }]}>
        {columns.map((week, ci) => (
          <View key={ci} style={[styles.column, { gap }]}>
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
  wrap: {},
  grid: { flexDirection: "row" },
  column: { flexDirection: "column" },
  splitCell: { flexDirection: "column", overflow: "hidden" },
  band: { flex: 1 },
});
