import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't infer a stray lockfile higher
  // up the filesystem (we're in a worktree under .claude/worktrees/).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@commit/ui-tokens", "@commit/convex"],
};

export default nextConfig;
