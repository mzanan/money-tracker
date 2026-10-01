import type { NextConfig } from "next";
import { posthogRewrites } from "./src/lib/analytics";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return posthogRewrites;
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
  },
};

export default nextConfig;
