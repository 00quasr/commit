import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  children: ReactNode;
  divider?: boolean;
  className?: string;
  innerClassName?: string;
};

export function Section({
  id,
  children,
  divider = true,
  className = "",
  innerClassName = "",
}: SectionProps) {
  return (
    <section id={id} className={`w-full ${divider ? "border-b border-hairline" : ""} ${className}`}>
      <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 py-20 sm:py-28 ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}
