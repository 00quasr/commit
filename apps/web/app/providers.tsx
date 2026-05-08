"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

// Fallback so prerender / preview deployments without an env var still
// have a ConvexProvider in the tree (the form catches network errors at
// submit time). Real deployments set NEXT_PUBLIC_CONVEX_URL.
const PLACEHOLDER_URL = "https://example.convex.cloud";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? PLACEHOLDER_URL),
  );
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
