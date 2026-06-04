import { dayKeyInTimezone } from "@commit/domain";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

const ROWS = 5;
const COLS = 6;
const DAYS = ROWS * COLS; // 30
const CELL = 7;
const GAP = 2;
const EMPTY_COLOR = "#252525";
const ADHOC_COLOR = "#333333";

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

interface HabitEntry {
  habitId: string;
  color: string;
}

export interface FeedMiniHeatmapProps {
  data: Array<{ dayKey: string; total: number; habits: HabitEntry[] }> | undefined;
  timezone: string;
}

export const FeedMiniHeatmap = memo(function FeedMiniHeatmap({
  data,
  timezone,
}: FeedMiniHeatmapProps) {
  const byDay = new Map((data ?? []).map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const cells = Array.from({ length: DAYS }, (_, i) => {
    const dayKey = addDays(todayKey, i - DAYS + 1);
    return byDay.get(dayKey) ?? { dayKey, total: 0, habits: [] };
  });

  const columns: (typeof cells)[] = Array.from({ length: COLS }, (_, col) =>
    cells.slice(col * ROWS, col * ROWS + ROWS),
  );

  return (
    <View style={{ flexDirection: "row", gap: GAP }}>
      {columns.map((col, ci) => (
        <View key={ci} style={{ flexDirection: "column", gap: GAP }}>
          {col.map(({ dayKey, total, habits }) => {
            if (habits.length === 0) {
              const bg = total > 0 ? ADHOC_COLOR : EMPTY_COLOR;
              return (
                <View
                  key={dayKey}
                  style={{ width: CELL, height: CELL, borderRadius: 1, backgroundColor: bg }}
                />
              );
            }
            return (
              <View key={dayKey} style={[styles.cell, styles.splitCell]}>
                {habits.map((h) => (
                  <View key={h.habitId} style={[styles.band, { backgroundColor: h.color }]} />
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  cell: { width: CELL, height: CELL, borderRadius: 1 },
  splitCell: { flexDirection: "column", overflow: "hidden" },
  band: { flex: 1 },
});
