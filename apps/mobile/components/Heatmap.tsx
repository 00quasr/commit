import { dayKeyInTimezone } from "@commit/domain";
import { memo, useMemo } from "react";
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

export type HeatmapColumns = Array<Array<{ dayKey: string; total: number; habits: HabitEntry[] }>>;

/**
 * Builds the cols×ROWS grid from raw day entries. Pulled out of the component so
 * callers with several heatmaps (Today's cumulative + per-habit cards) can build
 * all of them once when the underlying data arrives and pass the result via the
 * `columns` prop — keeping the (only) expensive part of a Heatmap render off the
 * critical path of a selection-switch re-render (COM-144).
 */
export function buildHeatmapColumns(
  data: Array<{ dayKey: string; total: number; habits: HabitEntry[] }>,
  timezone: string,
  cols: number = DEFAULT_COLS,
): HeatmapColumns {
  const byDay = new Map(data.map((d) => [d.dayKey, d]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);
  const totalCells = ROWS * cols;
  const startKey = addDays(todayKey, -(totalCells - 1));

  const result: HeatmapColumns = [];
  for (let col = 0; col < cols; col++) {
    const week: HeatmapColumns[number] = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = col * ROWS + row;
      const dayKey = addDays(startKey, idx);
      week.push(byDay.get(dayKey) ?? { dayKey, total: 0, habits: [] });
    }
    result.push(week);
  }
  return result;
}

export interface HeatmapProps {
  data?: Array<{ dayKey: string; total: number; habits: HabitEntry[] }>;
  /** Precomputed grid (see `buildHeatmapColumns`). Takes precedence over `data`. */
  columns?: HeatmapColumns;
  /** Required when `columns` isn't provided, since it's needed to compute the grid. */
  timezone?: string;
  width?: number;
  cols?: number;
  paddingH?: number;
  gap?: number;
}

function HeatmapComponent({
  data,
  columns: columnsProp,
  timezone,
  width,
  cols = DEFAULT_COLS,
  paddingH = DEFAULT_PADDING_H,
  gap = DEFAULT_GAP,
}: HeatmapProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = width ?? screenWidth;
  const cellSize = (containerWidth - paddingH * 2 - (cols - 1) * gap) / cols;

  // Rebuilding the day Map and the cols×ROWS grid is the expensive part of a
  // render; memoize it so a parent re-render (or unrelated data arriving) does
  // not regenerate all the cells mid-animation on Android (COM-144). Callers that
  // already precomputed this (via `buildHeatmapColumns`) pass it as `columns`.
  const columns = useMemo(
    () => columnsProp ?? buildHeatmapColumns(data ?? [], timezone ?? "UTC", cols),
    [columnsProp, data, timezone, cols],
  );

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

// Memoized so a parent re-render with unchanged props (e.g. Today re-rendering
// while a habit's data is unrelated) does not rebuild the grid (COM-144).
export const Heatmap = memo(HeatmapComponent);

const styles = StyleSheet.create({
  wrap: {},
  grid: { flexDirection: "row" },
  column: { flexDirection: "column" },
  splitCell: { flexDirection: "column", overflow: "hidden" },
  band: { flex: 1 },
});
