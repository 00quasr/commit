import { ConvexHttpClient } from "convex/browser";

let cached: ConvexHttpClient | null = null;

// HTTP client for server components / route handlers. Lazy so a missing
// NEXT_PUBLIC_CONVEX_URL only blows up the server-rendered surface that
// actually needs it (LiveCount), not the entire build.
export function getConvexHttpClient(): ConvexHttpClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  cached = new ConvexHttpClient(url);
  return cached;
}
