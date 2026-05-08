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
      className={`relative aspect-[9/19] w-full max-w-[280px] overflow-hidden rounded-[2.5rem] border border-hairline bg-block-elevated ${className}`}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[10px] text-text-tertiary font-mono">
        <span>9:41</span>
        <span className="flex gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-text-tertiary" />
          <span className="inline-block h-1 w-1 rounded-full bg-text-tertiary" />
          <span className="inline-block h-1 w-1 rounded-full bg-text-tertiary" />
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-3">
        <span className="inline-block h-7 w-7 rounded-full bg-white/20" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-text-primary">@{username}</span>
          <span className="font-mono text-[10px] text-text-tertiary">12-day streak</span>
        </div>
      </div>

      {/* Drop image area */}
      <div className="mx-5 aspect-square rounded-2xl border border-hairline bg-gradient-to-br from-white/[0.10] to-white/[0.02]" />

      {/* Caption */}
      <div className="px-5 pt-3 text-[13px] leading-snug text-text-secondary">{caption}</div>

      {/* Reaction row */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {REACTIONS.map((r) => (
          <span
            key={r}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-block-glass text-sm backdrop-blur-md"
          >
            {r}
          </span>
        ))}
      </div>

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/40 backdrop-blur-xl">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
            Locked
          </span>
          <span className="px-6 text-center text-sm text-text-primary">
            Drop today to unlock the feed.
          </span>
        </div>
      )}
    </div>
  );
}
