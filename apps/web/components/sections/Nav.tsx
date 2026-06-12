import Link from "next/link";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-full border border-hairline bg-block-glass pl-5 pr-2 backdrop-blur-xl shadow-[0_12px_32px_-16px_rgba(22,21,15,0.25)]">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-text-primary">
          commit
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href="#how"
            className="hidden h-9 items-center rounded-full px-3.5 text-sm text-text-secondary transition hover:text-text-primary sm:inline-flex"
          >
            How it works
          </a>
          <a
            href="#faq"
            className="hidden h-9 items-center rounded-full px-3.5 text-sm text-text-secondary transition hover:text-text-primary sm:inline-flex"
          >
            FAQ
          </a>
          <a
            href="#waitlist"
            className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-cream transition hover:bg-ink/85"
          >
            Get the beta
          </a>
        </nav>
      </div>
    </header>
  );
}
