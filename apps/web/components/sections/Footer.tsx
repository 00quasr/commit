import { CONTACT_EMAIL, X_URL } from "../../lib/constants";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 text-text-tertiary sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-text-primary">commit</span>
          <div className="flex items-center gap-5 font-mono text-[11px]">
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="transition hover:text-text-primary"
            >
              X
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-text-primary">
              {CONTACT_EMAIL}
            </a>
            <span>© {year}</span>
          </div>
        </div>
        <div className="mt-6 font-mono text-[10px] tracking-[0.06em] text-text-muted">
          Built in Frankfurt · Phase 1 beta
        </div>
      </div>
    </footer>
  );
}
