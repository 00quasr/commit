// Styled for a dark context — lives inside the ReciprocityFeature ink card.
type FeedCardMockProps = {
  username?: string;
  caption?: string;
  locked?: boolean;
  className?: string;
};

const REACTIONS = ["🔥", "💪", "👀", "💯"];

export function FeedCardMock({
  username = "alex",
  caption = "shipped the auth flow.",
  locked = false,
  className = "",
}: FeedCardMockProps) {
  return (
    <div
      className={`relative aspect-[9/19] w-full max-w-[280px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] ${className}`}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-2 font-mono text-[10px] text-white/40">
        <span>9:41</span>
        <span className="flex gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-white/40" />
          <span className="inline-block h-1 w-1 rounded-full bg-white/40" />
          <span className="inline-block h-1 w-1 rounded-full bg-white/40" />
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-3">
        <span className="inline-block h-7 w-7 rounded-full bg-white/20" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">@{username}</span>
          <span className="font-mono text-[10px] text-white/40">12-day streak</span>
        </div>
      </div>

      {/* Drop image area */}
      <div className="mx-5 aspect-square rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.02]" />

      {/* Caption */}
      <div className="px-5 pt-3 text-[13px] leading-snug text-white/70">{caption}</div>

      {/* Reaction row */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5 sm:gap-2">
        {REACTIONS.map((r) => (
          <span
            key={r}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs backdrop-blur-md sm:h-9 sm:w-9 sm:text-sm"
          >
            {r}
          </span>
        ))}
      </div>

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            Locked
          </span>
          <span className="px-6 text-center text-sm text-white">
            Drop today to unlock the feed.
          </span>
        </div>
      )}
    </div>
  );
}
