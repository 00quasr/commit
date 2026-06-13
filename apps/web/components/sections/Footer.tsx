import { CONTACT_EMAIL, X_URL } from "../../lib/constants";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "FAQ", href: "#faq" },
      { label: "Get the beta", href: "#waitlist" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "X", href: X_URL, external: true },
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto w-full max-w-[1400px] rounded-[2rem] bg-[#11120c] px-6 py-14 sm:rounded-[2.5rem] sm:px-12 sm:py-16">
        <div className="grid gap-12 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold tracking-tight text-white">commit</span>
            <p className="max-w-xs text-sm leading-[1.6] text-white/50">
              The drop is the proof. Built in Frankfurt · Phase 1 beta.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                {col.title}
              </span>
              {col.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  {...("external" in l && l.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-[0.08em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} commit · All rights reserved</span>
          <span>Invite-only beta · Summer 2026</span>
        </div>
      </div>
    </footer>
  );
}
