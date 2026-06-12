import type { ReactNode } from "react";
import Image from "next/image";
import { Section } from "../Section";
import { Glass } from "../Glass";
import { Body, Eyebrow, H2, Serif } from "../Type";

function CycleVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-2">
      <span className="rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-medium text-cream">
        Daily
      </span>
      <span className="rounded-full border border-ink/15 bg-white/70 px-3.5 py-1.5 text-[11px] text-text-secondary">
        Every 2 days
      </span>
      <span className="rounded-full border border-ink/15 bg-white/70 px-3.5 py-1.5 text-[11px] text-text-secondary">
        Weekly
      </span>
    </div>
  );
}

function DropVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative w-[120px] rounded-xl border border-ink/[0.08] bg-white p-2 shadow-[0_12px_24px_-12px_rgba(22,21,15,0.25)]">
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Image
            src="/photos/gym.jpg"
            alt="Proof photo: barbell deadlift at the gym"
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2 py-0.5 font-mono text-[9px] text-cream">
          0:42
        </span>
        <p className="pt-1.5 text-[9px] text-text-secondary">no drafts, no edits</p>
      </div>
    </div>
  );
}

function FeedVisual() {
  const rows = [
    { name: "alex", note: "shipped the auth flow.", img: "/photos/macbook.jpg" },
    { name: "riley", note: "5k under 25:00.", img: "/photos/run.jpg" },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      {rows.map((r) => (
        <div
          key={r.name}
          className="flex w-[200px] items-center gap-2.5 rounded-xl border border-ink/[0.08] bg-white p-2 shadow-[0_8px_20px_-12px_rgba(22,21,15,0.2)]"
        >
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
            <Image src={r.img} alt="" fill sizes="32px" className="object-cover" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-medium text-text-primary">@{r.name}</span>
            <span className="truncate text-[9px] text-text-secondary">{r.note}</span>
          </div>
        </div>
      ))}
      <span className="pt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted">
        resets at midnight
      </span>
    </div>
  );
}

const STEPS: { n: string; title: string; body: string; visual: ReactNode; tint: string }[] = [
  {
    n: "01",
    title: "Set the cycle",
    body: "Daily, every two days, weekly. Pick the rhythm that matches the goal — not someone else's.",
    visual: <CycleVisual />,
    tint: "bg-[#f2f5e2]",
  },
  {
    n: "02",
    title: "Drop the proof",
    body: "A photo of the work, shot in a 60-second window. No drafts, no edits, no gallery uploads.",
    visual: <DropVisual />,
    tint: "bg-[#f6f1e6]",
  },
  {
    n: "03",
    title: "See the feed",
    body: "Friends' drops, today only. Tomorrow it resets. Reactions, not comments. No follower counts.",
    visual: <FeedVisual />,
    tint: "bg-[#eef3f8]",
  },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="flex flex-col gap-12 sm:gap-14">
        <div className="flex flex-col items-center gap-4 text-center">
          <Glass className="px-4 py-1.5">
            <Eyebrow>How it works</Eyebrow>
          </Glass>
          <H2>
            Three steps. No <Serif>streak-saving</Serif> hacks.
          </H2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col gap-5 rounded-[1.75rem] border border-hairline bg-block-elevated p-5 shadow-[0_16px_40px_-28px_rgba(22,21,15,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,15,0.3)]"
            >
              <div className={`h-44 rounded-[1.25rem] ${s.tint}`}>{s.visual}</div>
              <div className="flex flex-col gap-2.5 px-2 pb-2">
                <span className="font-mono text-[11px] text-text-tertiary">{s.n}</span>
                <h3 className="text-xl font-medium text-text-primary">{s.title}</h3>
                <Body className="text-sm sm:text-[15px]">{s.body}</Body>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
