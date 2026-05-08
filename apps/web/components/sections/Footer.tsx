import { CONTACT_EMAIL, X_URL } from "../../lib/constants";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 text-text-tertiary sm:flex-row sm:items-center sm:px-6">
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
    </footer>
  );
}
