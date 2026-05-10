type CardProps = {
  username: string;
  caption: string;
  className?: string;
  imgClassName?: string;
  elevated?: boolean;
};

function Card({
  username,
  caption,
  className = "",
  imgClassName = "",
  elevated = false,
}: CardProps) {
  const edge = elevated
    ? "border border-white/[0.12] [box-shadow:0_24px_48px_-16px_rgba(0,0,0,0.7)]"
    : "border border-hairline";
  return (
    <div
      className={`relative flex w-[136px] flex-col gap-2 rounded-2xl ${edge} bg-block-elevated p-2.5 sm:w-[148px] sm:p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white/20" />
        <span className="text-[10px] font-medium text-text-primary">@{username}</span>
      </div>
      <div className={`aspect-square rounded-lg border border-hairline ${imgClassName}`} />
      <p className="text-[10px] leading-[1.35] text-text-secondary">{caption}</p>
    </div>
  );
}

export function MiniDropStack() {
  return (
    <div className="relative flex items-end justify-center">
      <Card
        username="you"
        caption="wrote 800 words."
        className="-mr-3 translate-y-1 -rotate-6 sm:-mr-4"
        imgClassName="bg-gradient-to-br from-white/[0.10] to-white/[0.02]"
      />
      <Card
        username="alex"
        caption="shipped the auth flow."
        elevated
        className="z-10 -translate-y-3"
        imgClassName="bg-gradient-to-tr from-white/[0.12] to-white/[0.02]"
      />
      <Card
        username="riley"
        caption="5k under 25:00."
        className="-ml-3 translate-y-1 rotate-[5deg] sm:-ml-4"
        imgClassName="bg-gradient-to-bl from-white/[0.10] to-white/[0.02]"
      />
    </div>
  );
}
