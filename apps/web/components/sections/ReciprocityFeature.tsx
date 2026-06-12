import { Section } from "../Section";
import { Body, H2, Serif } from "../Type";
import { DeviceFrame } from "../DeviceFrame";

export function ReciprocityFeature() {
  return (
    <Section id="reciprocity" innerClassName="py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#11120c] px-6 py-14 sm:rounded-[2.5rem] sm:px-12 sm:py-20">
        {/* Faint lime glow in the dark, echoing the locked-feed metaphor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_85%_15%,rgba(216,240,94,0.12),transparent_60%),radial-gradient(50%_60%_at_10%_90%,rgba(216,240,94,0.06),transparent_60%)]"
        />
        <div className="relative grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div className="flex max-w-xl flex-col gap-5">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-white/40">
              The reciprocity lock
            </span>
            <H2 className="text-white">
              Drop today, or the feed stays <Serif>dark.</Serif>
            </H2>
            <Body className="text-white/70">
              No lurking. If you didn&apos;t commit today, you don&apos;t see what your friends did.
              The rule cuts both ways — and it&apos;s why the feed actually means something.
            </Body>
            <Body className="text-sm text-white/45">
              Real screens from the beta. Your public profile stays visible. The private feed
              doesn&apos;t.
            </Body>
          </div>
          <div className="flex items-center justify-center gap-5 sm:gap-8">
            <DeviceFrame
              src="/screens/feed-locked.png"
              alt="commit feed in its locked state — 3 friends dropped today, drop something to see their proof"
              className="-rotate-2 opacity-95"
            />
            <DeviceFrame
              src="/screens/feed-unlocked.png"
              alt="commit feed unlocked — alex's drop with a photo of code on a MacBook, 23-day streak"
              className="rotate-1"
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
