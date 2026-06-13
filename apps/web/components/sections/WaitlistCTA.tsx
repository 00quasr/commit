import { Display, Eyebrow } from "../Type";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { X_URL } from "../../lib/constants";

export function WaitlistCTA() {
  return (
    <section className="px-3 pb-3 pt-8 sm:px-4 sm:pb-4 sm:pt-12">
      <div className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[2rem] bg-lime sm:rounded-[2.5rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_110%,rgba(255,255,255,0.55),transparent_70%),radial-gradient(40%_40%_at_90%_0%,rgba(167,205,255,0.3),transparent_70%)]"
        />
        <div className="relative flex flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
          <Eyebrow className="text-ink/55">Join the beta cluster</Eyebrow>
          <Display className="max-w-3xl">The drop is the proof.</Display>
          <p className="max-w-xl font-sans text-base text-ink/70 sm:text-lg">
            Solo founders, OSS maintainers, course creators. If you&apos;re shipping in public, this
            is for you.
          </p>
          <WaitlistForm source="closing" className="items-center" />
          <div className="flex items-center gap-4">
            <LiveCount className="!text-ink/55" />
            <span className="font-mono text-[11px] text-ink/40">·</span>
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[11px] text-ink/55 transition hover:text-ink"
            >
              Follow on X →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
