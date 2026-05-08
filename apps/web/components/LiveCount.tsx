import { api } from "@commit/convex/api";
import { getConvexHttpClient } from "../lib/convex-server";

// Server component. Page sets `revalidate = 60` so this query runs at most
// once per minute per region.
export async function LiveCount({ className = "" }: { className?: string }) {
  let count = 0;
  try {
    count = await getConvexHttpClient().query(api.waitlist.count, {});
  } catch {
    // If Convex is unreachable at build/render time, render a soft fallback
    // rather than crash the page.
    count = 0;
  }
  if (count <= 0) {
    return (
      <span className={`font-mono text-[11px] text-text-tertiary ${className}`}>
        Beta · invite-only · launching this summer
      </span>
    );
  }
  return (
    <span className={`font-mono text-[11px] text-text-tertiary ${className}`}>
      {count.toLocaleString()} {count === 1 ? "builder" : "builders"} committed
    </span>
  );
}
