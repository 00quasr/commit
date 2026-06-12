import { Body, Display, Serif } from "../Type";
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
        <div className="relative flex flex-col items-center gap-10 px-4 pb-24 pt-36 text-center sm:gap-12 sm:px-6 sm:pb-20 sm:pt-44">
          <div className="flex flex-col items-center gap-7">
            <Display className="max-w-4xl">
              Show your work.
              <br />
              See <Serif>theirs.</Serif>
            </Display>
            <Body className="max-w-xl">
              A photo of the work, on the rhythm you set. What your friends got done today stays
              locked until you post yours.
            </Body>
          </div>
          <div className="flex flex-col items-center gap-3" id="waitlist">
            <WaitlistForm source="hero" className="items-center" />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6">
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
          <MiniDropStack />
        </div>
      </div>
    </section>
  );
}
