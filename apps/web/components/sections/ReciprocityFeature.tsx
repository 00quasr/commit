import { Section } from "../Section";
import { Body, Eyebrow, H2 } from "../Type";
import { FeedCardMock } from "../mocks/FeedCardMock";

export function ReciprocityFeature() {
  return (
    <Section>
      <div className="grid gap-14 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="flex max-w-xl flex-col gap-5">
          <Eyebrow>The reciprocity lock</Eyebrow>
          <H2>Drop today, or the feed stays dark.</H2>
          <Body>
            No lurking. If you didn&apos;t commit today, you don&apos;t see what your friends did.
            The rule cuts both ways — and it&apos;s why the feed actually means something.
          </Body>
          <Body className="text-sm text-text-tertiary">
            Your public profile stays visible. The private feed doesn&apos;t.
          </Body>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <FeedCardMock locked username="you" caption="" className="opacity-90" />
          <FeedCardMock username="riley" caption="finally fixed the migration." />
        </div>
      </div>
    </Section>
  );
}
