import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * CSS-drawn iPhone shell around a real app screenshot (1170×2532 capture from
 * the iOS simulator). Metal edge → black bezel → screen with notch overlay.
 */
export function DeviceFrame({ src, alt, className = "", priority = false }: Props) {
  return (
    <div
      className={`relative w-full max-w-[280px] rounded-[3rem] bg-gradient-to-b from-[#4a4a4d] via-[#323234] to-[#2c2c2e] p-[3px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] ${className}`}
    >
      <div className="rounded-[2.85rem] bg-black p-[6px]">
        <div className="relative aspect-[1170/2532] overflow-hidden rounded-[2.4rem] bg-black">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="280px"
            className="object-cover"
          />
          {/* Notch */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 h-[22px] w-[42%] -translate-x-1/2 rounded-b-[13px] bg-black"
          />
        </div>
      </div>
    </div>
  );
}
