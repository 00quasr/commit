// Deterministic 7-row × 26-col heatmap. Index-based pseudo-random so SSR
// markup matches CSR markup — no hydration drift.
const ROWS = 7;
const COLS = 26;

function intensity(index: number): number {
  // Cheap deterministic hash. Output in [0, 1].
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function cellOpacityClass(index: number): string {
  const v = intensity(index);
  // Bias most cells toward low fill — looks like a real activity grid.
  if (v < 0.45) return "bg-white/[0.05]";
  if (v < 0.7) return "bg-white/[0.12]";
  if (v < 0.86) return "bg-white/[0.22]";
  if (v < 0.96) return "bg-white/[0.32]";
  return "bg-white/[0.45]";
}

export function HeatmapMock({ className = "" }: { className?: string }) {
  const cells = Array.from({ length: ROWS * COLS });
  return (
    <div
      className={`grid w-full max-w-full ${className}`}
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridAutoRows: "1fr",
        gap: "3px",
      }}
    >
      {cells.map((_, i) => (
        <div key={i} className={`aspect-square rounded-[2px] ${cellOpacityClass(i)}`} />
      ))}
    </div>
  );
}
