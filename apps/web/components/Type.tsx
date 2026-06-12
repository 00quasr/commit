import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string };

export function Display({ children, className = "" }: Props) {
  return (
    <h1
      className={`font-sans font-medium text-text-primary text-[2.75rem] sm:text-[4rem] md:text-[4.75rem] leading-display tracking-display ${className}`}
    >
      {children}
    </h1>
  );
}

export function H2({ children, className = "" }: Props) {
  return (
    <h2
      className={`font-sans font-medium text-text-primary text-[2rem] sm:text-[2.75rem] leading-[1.08] tracking-display ${className}`}
    >
      {children}
    </h2>
  );
}

/** Serif italic accent for display headlines — the Novu-style contrast word. */
export function Serif({ children, className = "" }: Props) {
  return (
    <em className={`font-serif font-normal italic tracking-[-0.01em] ${className}`}>{children}</em>
  );
}

export function Eyebrow({ children, className = "" }: Props) {
  return (
    <span
      className={`font-mono uppercase text-[0.7rem] tracking-[0.22em] text-text-tertiary ${className}`}
    >
      {children}
    </span>
  );
}

export function Body({ children, className = "" }: Props) {
  return (
    <p className={`font-sans text-base sm:text-lg leading-[1.55] text-text-secondary ${className}`}>
      {children}
    </p>
  );
}

export function Mono({ children, className = "" }: Props) {
  return <span className={`font-mono text-xs text-text-tertiary ${className}`}>{children}</span>;
}
