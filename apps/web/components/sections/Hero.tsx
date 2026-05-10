import { Section } from "../Section";
import { Body, Display, Eyebrow } from "../Type";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { MiniDropStack } from "../mocks/MiniDropStack";
import { X_URL } from "../../lib/constants";

export function Hero() {
  return (
    <Section innerClassName="pt-24 pb-20 sm:pt-28 sm:pb-28 lg:pt-32">
      <div className="flex flex-col items-center gap-12 text-center">
        <MiniDropStack />
        <div className="flex flex-col items-center gap-7">
          <Eyebrow>Beta · Invite-only</Eyebrow>
          <Display className="max-w-3xl">
            Stop drifting.
            <br />
            Start finishing.
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
      </div>
    </Section>
  );
}
