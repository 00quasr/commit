import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function MockFrame({ children, className = "" }: Props) {
  return (
    <div
      className={`relative rounded-3xl bg-block-elevated p-2 ring-1 ring-white/[0.06] sm:p-3 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]"
      />
      {children}
    </div>
  );
}
