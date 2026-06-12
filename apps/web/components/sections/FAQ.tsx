import { Section } from "../Section";
import { H2, Serif } from "../Type";

const FAQS = [
  {
    q: "How is commit different from a habit tracker?",
    a: "Habit trackers ask you to tap a button and take your word for it. commit asks for the work: a photo, on a cycle you set, visible to people doing the same thing. The streak is a side effect of proof, not the product.",
  },
  {
    q: "What's the reciprocity lock?",
    a: "If you didn't drop today, your friends' feed stays locked. No lurking, no passive scrolling. The rule cuts both ways — that's why seeing a drop means something. Your public profile stays visible; the private feed doesn't.",
  },
  {
    q: "What counts as a drop?",
    a: "A photo of the work, shot in a 60-second window. No gallery uploads, no drafts, no edits. Code on the screen, pages in the notebook, shoes on the trail.",
  },
  {
    q: "What if my goal isn't daily?",
    a: "Set the cycle per goal: daily, every two days, or weekly. The feed and the lock follow your rhythm. No streak-saving hacks, no freeze tokens.",
  },
  {
    q: "Why reactions instead of comments?",
    a: "Comments turn a proof feed into a performance. Reactions keep it honest — quick fire from people shipping alongside you. No follower counts either.",
  },
  {
    q: "When do I get in?",
    a: "It's invite-only while the beta cluster is small. Join the waitlist and watch your inbox — invites go out in waves over the summer.",
  },
];

export function FAQ() {
  return (
    <Section id="faq">
      <div className="flex flex-col gap-10 sm:gap-12">
        <H2 className="text-center">
          Got <Serif>questions?</Serif>
        </H2>
        <div className="mx-auto w-full max-w-3xl">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-divide">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-base font-medium text-text-primary sm:text-lg">{f.q}</span>
                <span
                  aria-hidden
                  className="shrink-0 text-2xl font-light leading-none text-text-tertiary transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-10 text-[15px] leading-[1.6] text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
