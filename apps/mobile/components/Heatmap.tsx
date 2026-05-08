import { dayKeyInTimezone } from "@commit/domain";
import { colors, fonts } from "@commit/ui-tokens";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const CELL = 11;
const GAP = 2;
const ROWS = 7; // Mon-Sun
const COLS = 53;

const PALETTE = ["#0e0e0e", "#1a4d2e", "#2d7a47", "#3fa860", "#5fd97a"] as const;

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

/**
 * Adds N days to a "YYYY-MM-DD" string. Pure UTC math; safe because dayKeys
 * are already timezone-normalized via dayKeyInTimezone.
 */
function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Day-of-week index using the dayKey (Mon=0..Sun=6). UTC math is correct
 * for already-normalized dayKeys.
 */
function dayOfWeekMonFirst(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  // getUTCDay: Sun=0..Sat=6 → shift to Mon=0..Sun=6
  return (dt.getUTCDay() + 6) % 7;
}

export interface HeatmapProps {
  data: Array<{ dayKey: string; count: number }>;
  timezone: string;
}

export function Heatmap({ data, timezone }: HeatmapProps) {
  const counts = new Map(data.map((d) => [d.dayKey, d.count]));
  const todayKey = dayKeyInTimezone(Date.now(), timezone);

  // Walk back to fill ROWS*COLS cells, ending on today.
  // Anchor: today should be at (col COLS-1, row dayOfWeek(today)).
  const todayDow = dayOfWeekMonFirst(todayKey);
  // Cell index for today within the grid (cells are filled column-major).
  const todayIndex = (COLS - 1) * ROWS + todayDow;
  const startOffset = -todayIndex;
  // First cell's dayKey:
  const startKey = addDays(todayKey, startOffset);

  // Build columns
  const columns: Array<Array<{ dayKey: string; count: number }>> = [];
  for (let col = 0; col < COLS; col++) {
    const week: Array<{ dayKey: string; count: number }> = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = col * ROWS + row;
      if (idx > todayIndex) {
        // future cell — render as void
        week.push({ dayKey: "", count: -1 });
      } else {
        const dayKey = addDays(startKey, idx);
        week.push({ dayKey, count: counts.get(dayKey) ?? 0 });
      }
    }
    columns.push(week);
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{total} drops in the last year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.grid}>
          {columns.map((week, ci) => (
            <View key={ci} style={styles.column}>
              {week.map((cell, ri) =>
                cell.count < 0 ? (
                  <View key={ri} style={[styles.cell, { backgroundColor: "transparent" }]} />
                ) : (
                  <View
                    key={ri}
                    style={[styles.cell, { backgroundColor: PALETTE[intensity(cell.count)] }]}
                  />
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Less</Text>
        {PALETTE.map((color, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  title: { color: colors.fg, fontSize: 14, fontFamily: fonts.mono, marginBottom: 12 },
  scroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  grid: { flexDirection: "row", gap: GAP },
  column: { flexDirection: "column", gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  legendLabel: { color: "#666", fontSize: 11, fontFamily: fonts.mono },
  legendCell: { width: CELL, height: CELL, borderRadius: 2 },
});
