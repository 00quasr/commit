import { Section } from "../Section";
import { Body, Eyebrow, H2, Serif } from "../Type";
import { Glass } from "../Glass";
import { DeviceFrame } from "../DeviceFrame";

export function ProfileFeature() {
  return (
    <Section id="profile">
      <div className="grid gap-14 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="flex justify-center md:order-1">
          <DeviceFrame
            src="/screens/profile.png"
            alt="commit profile screen — alex's commitment heatmap, 142 total drops, 23-day streak"
            className="max-w-[300px]"
          />
        </div>
        <div className="flex max-w-xl flex-col gap-5 md:order-2">
          <Glass className="self-start px-4 py-1.5">
            <Eyebrow>Public proof</Eyebrow>
          </Glass>
          <H2>
            Your shipping log, <Serif>on display.</Serif>
          </H2>
          <Body>
            Every profile renders the receipts: heatmap of every drop, current streak, recent work.
            Linkable. Shareable. Hard to fake.
          </Body>
          <Body className="text-sm text-text-tertiary">
            Built for founders shipping in public. The profile is the portfolio.
          </Body>
        </div>
      </div>
    </Section>
  );
}
