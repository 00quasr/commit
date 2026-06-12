import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function MockFrame({ children, className = "" }: Props) {
  return (
    <div
      className={`relative rounded-3xl bg-white p-2 ring-1 ring-ink/[0.06] shadow-[0_24px_48px_-24px_rgba(22,21,15,0.18)] sm:p-3 ${className}`}
    >
      {children}
    </div>
  );
}
