import { Section } from "../Section";
import { Body, Display, Eyebrow } from "../Type";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { FeedCardMock } from "../mocks/FeedCardMock";
import { X_URL } from "../../lib/constants";

export function Hero() {
  return (
    <Section innerClassName="pt-24 sm:pt-28">
      <div className="grid gap-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="flex flex-col gap-7">
          <Eyebrow>Beta · Invite-only</Eyebrow>
          <Display>
            Stop drifting.
            <br />
            Start finishing.
          </Display>
          <Body className="max-w-xl">
            Strava + BeReal for any goal worth committing to. Set the cycle. Drop the proof. The
            feed unlocks when you do.
          </Body>
          <div className="flex flex-col gap-3" id="waitlist">
            <WaitlistForm source="hero" />
            <div className="flex items-center gap-4 px-2">
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
        <div className="flex justify-center md:justify-end">
          <FeedCardMock />
        </div>
      </div>
    </Section>
  );
}
