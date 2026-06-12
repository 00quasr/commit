import { HeatmapMock } from "./HeatmapMock";

export function ProfileMock({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full max-w-md flex-col gap-5 rounded-3xl bg-white p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <span className="inline-block h-14 w-14 rounded-full bg-gradient-to-br from-[#ffe3c4] to-[#ffd6a8]" />
        <div className="flex flex-col">
          <span className="text-base font-medium text-text-primary">@alex</span>
          <span className="font-mono text-[11px] text-text-tertiary">Frankfurt · DE</span>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-lime px-3 py-1 text-xs font-medium text-ink">
          🔥 12-day streak
        </span>
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
          <div className="aspect-square rounded-xl bg-gradient-to-br from-lime-soft to-[#f9fde9]" />
          <div className="aspect-square rounded-xl bg-gradient-to-br from-[#d7e8ff] to-[#f3f8ff]" />
          <div className="aspect-square rounded-xl bg-gradient-to-br from-[#ffe3c4] to-[#fff7ee]" />
        </div>
      </div>
    </div>
  );
}
