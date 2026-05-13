import { dayKeyInTimezone } from "@commit/domain";
import { memo } from "react";
import { View } from "react-native";

const ROWS = 5;
const COLS = 6;
const DAYS = ROWS * COLS; // 30
const CELL = 7;
const GAP = 2;
const PALETTE = ["#252525", "#1a4d2e", "#2d7a47", "#3fa860", "#5fd97a"] as const;

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

export interface MiniHeatmapProps {
  data: Array<{ dayKey: string; count: number }>;
  timezone: string;
}

export const MiniHeatmap = memo(function MiniHeatmap({ data, timezone }: MiniHeatmapProps) {
  const counts = new Map(data.map((d) => [d.dayKey, d.count]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  const cells = Array.from({ length: DAYS }, (_, i) => {
    const dayKey = addDays(todayKey, i - DAYS + 1);
    return { dayKey, count: counts.get(dayKey) ?? 0 };
  });

  const columns: typeof cells[] = Array.from({ length: COLS }, (_, col) =>
    cells.slice(col * ROWS, col * ROWS + ROWS),
  );

  return (
    <View style={{ flexDirection: "row", gap: GAP }}>
      {columns.map((col, ci) => (
        <View key={ci} style={{ flexDirection: "column", gap: GAP }}>
          {col.map(({ dayKey, count }) => (
            <View
              key={dayKey}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 1,
                backgroundColor: PALETTE[intensity(count)],
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});
