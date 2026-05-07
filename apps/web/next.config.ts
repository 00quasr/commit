import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@commit/ui-tokens"],
};

export default nextConfig;
