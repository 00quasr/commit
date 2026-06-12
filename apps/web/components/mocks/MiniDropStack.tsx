import Image from "next/image";

type CardProps = {
  username: string;
  caption: string;
  photo: string;
  avatar?: string;
  className?: string;
  elevated?: boolean;
};

function Card({ username, caption, photo, avatar, className = "", elevated = false }: CardProps) {
  const edge = elevated
    ? "border border-ink/[0.08] [box-shadow:0_24px_48px_-16px_rgba(22,21,15,0.3)]"
    : "border border-hairline shadow-[0_12px_28px_-16px_rgba(22,21,15,0.2)]";
  return (
    <div
      className={`flex w-[31%] min-w-0 flex-col gap-2 rounded-2xl ${edge} bg-white p-2 sm:w-[160px] sm:p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 rounded-full object-cover"
          />
        ) : (
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-ink/15" />
        )}
        <span className="text-[10px] font-medium text-text-primary">@{username}</span>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-lg">
        {/* Decorative — the caption below carries the content. */}
        <Image src={photo} alt="" fill sizes="160px" className="object-cover" />
      </div>
      <p className="text-left text-[10px] leading-[1.35] text-text-secondary">{caption}</p>
    </div>
  );
}

export function MiniDropStack() {
  return (
    <div className="flex w-full max-w-md items-start justify-center gap-2 sm:max-w-none sm:gap-4">
      <Card
        username="you"
        caption="wrote 800 words."
        photo="/photos/writing.jpg"
        className="translate-y-3"
      />
      <Card
        username="alex"
        caption="shipped the auth flow."
        photo="/photos/code.jpg"
        avatar="/photos/avatar-alex.jpg"
        elevated
      />
      <Card
        username="riley"
        caption="5k under 25:00."
        photo="/photos/run.jpg"
        avatar="/photos/avatar-riley.jpg"
        className="translate-y-3"
      />
    </div>
  );
}
