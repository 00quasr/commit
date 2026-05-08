import type { ReactNode } from "react";

type GlassProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "span";
};

export function Glass({ children, className = "", as = "div" }: GlassProps) {
  const Comp = as;
  return (
    <Comp
      className={`inline-flex items-center rounded-2xl border border-hairline bg-block-glass backdrop-blur-md ${className}`}
    >
      {children}
    </Comp>
  );
}
