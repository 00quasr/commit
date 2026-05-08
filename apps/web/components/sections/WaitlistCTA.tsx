import { Section } from "../Section";
import { Display, Eyebrow } from "../Type";
import { LiveCount } from "../LiveCount";
import { WaitlistForm } from "../WaitlistForm";
import { X_URL } from "../../lib/constants";

export function WaitlistCTA() {
  return (
    <Section divider={false} innerClassName="py-28 sm:py-36">
      <div className="flex flex-col items-center gap-8 text-center">
        <Eyebrow>Join the beta cluster</Eyebrow>
        <Display className="max-w-3xl">The drop is the proof.</Display>
        <p className="max-w-xl font-sans text-base text-text-secondary sm:text-lg">
          Solo founders, OSS maintainers, course creators. If you&apos;re shipping in public, this
          is for you.
        </p>
        <WaitlistForm source="closing" className="items-center" />
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
    </Section>
  );
}
