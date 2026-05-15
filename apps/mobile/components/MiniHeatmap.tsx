import { dayKeyInTimezone } from "@commit/domain";
import { StyleSheet, View } from "react-native";

const CELL = 8;
const GAP = 2;
const ROWS = 7;
const COLS = 26; // ~6 months

const EMPTY_COLOR = "#0e0e0e";

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

export interface MiniHeatmapProps {
  data: Array<{ dayKey: string }>;
  color: string;
  timezone: string;
}

export function MiniHeatmap({ data, color, timezone }: MiniHeatmapProps) {
  const activeDays = new Set(data.map((d) => d.dayKey));
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
            const active = activeDays.has(dayKey);
            return (
              <View
                key={row}
                style={[styles.cell, { backgroundColor: active ? color : EMPTY_COLOR }]}
              />
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
  cell: { width: CELL, height: CELL, borderRadius: 1.5 },
});
