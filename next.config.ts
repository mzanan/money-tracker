import type { NextConfig } from "next";
import { posthogRewrites, trailingSlashRedirect } from "./src/lib/analytics";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return posthogRewrites;
  },
  async redirects() {
    return [trailingSlashRedirect];
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
  },
};

export default nextConfig;
