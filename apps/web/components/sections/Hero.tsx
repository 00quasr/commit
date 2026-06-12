import { Body, Display } from "../Type";
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
        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-16 pt-32 sm:px-8 sm:pt-40 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-8 md:pb-24 lg:px-10">
          <div className="flex flex-col items-start gap-6 text-left">
            <Display>
              Show your work.
              <br />
              See theirs.
            </Display>
            <Body className="max-w-md">
              A photo of the work, on the rhythm you set. What your friends got done today stays
              locked until you post yours.
            </Body>
            <div className="mt-2 flex w-full flex-col gap-3" id="waitlist">
              <WaitlistForm source="hero" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <LiveCount className="whitespace-nowrap" />
                <a
                  href={X_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="whitespace-nowrap font-mono text-[11px] text-text-secondary transition hover:text-text-primary"
                >
                  Follow on X →
                </a>
              </div>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <MiniDropStack />
          </div>
        </div>
      </div>
    </section>
  );
}
