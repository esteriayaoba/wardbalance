// Trigger redeployment after GitHub app permissions updated
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Source TypeScript service worker — compiled by Serwist at build time
  swSrc: "src/sw.ts",
  // Output to /public so it serves at the root (required for SW scope)
  swDest: "public/sw.js",
  // Disable in development — avoids caching confusion during local dev
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default withSerwist(nextConfig);
