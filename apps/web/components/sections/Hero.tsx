import Image from "next/image";
import { Body, Display, Serif } from "../Type";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { X_URL } from "../../lib/constants";

export function Hero() {
  return (
    <section className="relative w-full">
      <div className="relative h-[92svh] max-h-[1000px] min-h-[640px] w-full">
        <Image
          src="/photos/hero.jpg"
          alt="Three friends laughing together while working on laptops"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim so the white headline reads over the photo */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/30 to-black/60"
        />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-4 pt-14 text-center sm:gap-9 sm:px-6">
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-white/85 backdrop-blur-md">
            Beta · Invite-only
          </span>
          <Display className="max-w-4xl text-white">
            Stop drifting.
            <br />
            Start <Serif>finishing.</Serif>
          </Display>
          <Body className="max-w-xl text-white/85">
            Strava + BeReal for any goal worth committing to. Set the cycle. Drop the proof. The
            feed unlocks when you do.
          </Body>
          <div className="flex flex-col items-center gap-3" id="waitlist">
            <WaitlistForm source="hero" tone="dark" className="items-center" />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6">
              <LiveCount className="!text-white/65" />
              <span className="font-mono text-[11px] text-white/40">·</span>
              <a
                href={X_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-[11px] text-white/75 transition hover:text-white"
              >
                Follow on X →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
