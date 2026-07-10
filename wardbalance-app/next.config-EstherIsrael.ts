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
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.flutterwave.com https://js.paystack.com https://www.googletagmanager.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.r2.dev https://res.cloudinary.com",
            "font-src 'self' data:",
            "connect-src 'self' https://api.flutterwave.com https://api.paystack.co https://vitals.vercel-insights.com",
            "frame-src 'self' https://checkout.flutterwave.com https://js.paystack.com",
            "manifest-src 'self'",
            "worker-src 'self' blob:",
          ].join("; "),
        },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      ],
    },
  ],
};

export default withSerwist(nextConfig);
