// Deterministic 7-row × 26-col heatmap. Index-based pseudo-random so SSR
// markup matches CSR markup — no hydration drift.
const ROWS = 7;
const COLS = 26;

function intensity(index: number): number {
  // Cheap deterministic hash. Output in [0, 1].
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function cellClass(index: number): string {
  const v = intensity(index);
  // Bias most cells toward low fill — looks like a real activity grid.
  if (v < 0.45) return "bg-ink/[0.06]";
  if (v < 0.7) return "bg-[#e3f3a4]";
  if (v < 0.86) return "bg-[#c8e668]";
  if (v < 0.96) return "bg-[#a3d23a]";
  return "bg-[#7fb31c]";
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
        <div key={i} className={`aspect-square rounded-[2px] ${cellClass(i)}`} />
      ))}
    </div>
  );
}
