import { Glass } from "../Glass";
import { HeatmapMock } from "./HeatmapMock";

export function ProfileMock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full max-w-md flex-col gap-5 rounded-3xl border border-hairline bg-block-elevated p-6 ${className}`}
    >
      <div className="flex items-center gap-4">
        <span className="inline-block h-14 w-14 rounded-full bg-white/20" />
        <div className="flex flex-col">
          <span className="text-base font-medium text-text-primary">@alex</span>
          <span className="font-mono text-[11px] text-text-tertiary">Frankfurt · DE</span>
        </div>
        <Glass className="ml-auto px-3 py-1 text-xs text-text-primary">🔥 12-day streak</Glass>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
            Level 4
          </span>
          <span className="font-mono text-[10px] text-text-tertiary">320 / 500 xp</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[64%] rounded-full bg-white/60" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
            Last 26 weeks
          </span>
          <span className="font-mono text-[10px] text-text-tertiary">182 days</span>
        </div>
        <HeatmapMock />
      </div>

      <div>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
          Recent drops
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl border border-hairline bg-gradient-to-br from-white/[0.10] to-white/[0.02]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
