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
    ? "border border-ink/[0.08] [box-shadow:0_24px_48px_-16px_rgba(22,21,15,0.3)]"
    : "border border-hairline shadow-[0_12px_28px_-16px_rgba(22,21,15,0.2)]";
  return (
    <div
      className={`relative flex w-[140px] flex-col gap-2 rounded-2xl ${edge} bg-white p-2.5 sm:w-[160px] sm:p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-ink/15" />
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
        imgClassName="bg-gradient-to-br from-[#ffe3c4] to-[#fff7ee]"
      />
      <Card
        username="alex"
        caption="shipped the auth flow."
        elevated
        className="z-10 -translate-y-3"
        imgClassName="bg-gradient-to-tr from-lime-soft to-[#f9fde9]"
      />
      <Card
        username="riley"
        caption="5k under 25:00."
        className="-ml-3 translate-y-1 rotate-[5deg] sm:-ml-4"
        imgClassName="bg-gradient-to-bl from-[#d7e8ff] to-[#f3f8ff]"
      />
    </div>
  );
}
