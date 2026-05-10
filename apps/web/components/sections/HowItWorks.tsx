import { Section } from "../Section";
import { Glass } from "../Glass";
import { Body, Eyebrow, H2 } from "../Type";

const STEPS = [
  {
    n: "01",
    title: "Set the cycle",
    body: "Daily, every two days, weekly. Pick the rhythm that matches the goal — not someone else's.",
  },
  {
    n: "02",
    title: "Drop the proof",
    body: "Photo of the work. Optional 30-second voice memo. 60-second window. No drafts, no edits.",
  },
  {
    n: "03",
    title: "See the feed",
    body: "Friends' drops, today only. Tomorrow it resets. Reactions, not comments. No follower counts.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="flex flex-col gap-12">
        <div className="flex max-w-2xl flex-col gap-4">
          <Eyebrow>How it works</Eyebrow>
          <H2>Three steps. No streak-saving hacks.</H2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col gap-4 rounded-2xl border border-hairline bg-block-elevated p-6 transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              <Glass className="px-3 py-1">
                <span className="font-mono text-[11px] text-text-secondary">{s.n}</span>
              </Glass>
              <h3 className="text-lg font-medium text-text-primary">{s.title}</h3>
              <Body className="text-sm">{s.body}</Body>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
