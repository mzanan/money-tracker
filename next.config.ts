import type { NextConfig } from "next";
import { posthogRewrites, trailingSlashRedirect } from "./src/lib/analytics";
import { securityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return posthogRewrites;
  },
  async redirects() {
    return [trailingSlashRedirect];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
  },
};

export default nextConfig;
