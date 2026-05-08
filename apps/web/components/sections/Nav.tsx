import Link from "next/link";
import { X_URL } from "../../lib/constants";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-medium tracking-tight text-text-primary">
          commit
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden h-8 items-center rounded-full border border-hairline px-3 text-xs text-text-secondary transition hover:border-white/30 hover:text-text-primary sm:inline-flex"
          >
            Follow on X
          </a>
          <a
            href="#waitlist"
            className="inline-flex h-8 items-center rounded-full bg-text-primary px-3 text-xs font-medium text-bg transition hover:bg-white/90"
          >
            Get the beta
          </a>
        </nav>
      </div>
    </header>
  );
}
