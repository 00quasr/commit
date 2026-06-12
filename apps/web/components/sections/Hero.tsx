import { Body, Display, Eyebrow, Serif } from "../Type";
import { Glass } from "../Glass";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { MiniDropStack } from "../mocks/MiniDropStack";
import { X_URL } from "../../lib/constants";

export function Hero() {
  return (
    <section className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#f2f5e2] sm:rounded-[2.5rem]">
        {/* Soft lime + sky washes, Novu-style airy canvas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_-10%,rgba(216,240,94,0.5),transparent_70%),radial-gradient(45%_40%_at_88%_12%,rgba(167,205,255,0.4),transparent_70%),radial-gradient(40%_35%_at_8%_25%,rgba(255,214,168,0.35),transparent_70%)]"
        />
        <div className="relative flex flex-col items-center gap-12 px-4 pb-24 pt-32 text-center sm:gap-14 sm:px-6 sm:pb-20 sm:pt-40">
          <div className="flex flex-col items-center gap-7">
            <Glass className="px-4 py-1.5">
              <Eyebrow>Beta · Invite-only</Eyebrow>
            </Glass>
            <Display className="max-w-4xl">
              Stop drifting.
              <br />
              Start <Serif>finishing.</Serif>
            </Display>
            <Body className="max-w-xl">
              Strava + BeReal for any goal worth committing to. Set the cycle. Drop the proof. The
              feed unlocks when you do.
            </Body>
          </div>
          <div className="flex flex-col items-center gap-3" id="waitlist">
            <WaitlistForm source="hero" className="items-center" />
            <div className="flex items-center gap-4">
              <LiveCount />
              <span className="font-mono text-[11px] text-text-muted">·</span>
              <a
                href={X_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-[11px] text-text-secondary transition hover:text-text-primary"
              >
                Follow on X →
              </a>
            </div>
          </div>
          <MiniDropStack />
        </div>
      </div>
    </section>
  );
}
