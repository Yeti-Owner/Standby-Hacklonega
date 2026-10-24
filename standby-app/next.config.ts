import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same-origin browser requests; provider credentials stay in the Python process.
  async rewrites() {
    return [{ source: "/api/concierge/:path*", destination: `http://127.0.0.1:${process.env.STANDBY_API_PORT || "7860"}/api/:path*` }];
  },
  experimental: { proxyClientMaxBodySize: "26mb", proxyTimeout: 180000 },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
