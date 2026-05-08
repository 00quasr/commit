import { Section } from "../Section";
import { Body, Eyebrow, H2 } from "../Type";
import { ProfileMock } from "../mocks/ProfileMock";

export function ProfileFeature() {
  return (
    <Section>
      <div className="grid gap-14 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="flex justify-center md:order-1">
          <ProfileMock />
        </div>
        <div className="flex max-w-xl flex-col gap-5 md:order-2">
          <Eyebrow>Public proof</Eyebrow>
          <H2>Your shipping log, on display.</H2>
          <Body>
            commit.app/yourname renders the receipts: heatmap of every drop, current streak, recent
            work. Linkable. Shareable. Hard to fake.
          </Body>
          <Body className="text-sm text-text-tertiary">
            Built for founders shipping in public. The profile is the portfolio.
          </Body>
        </div>
      </div>
    </Section>
  );
}
