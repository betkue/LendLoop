import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at i18n/request.ts, which loads the messages per locale.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Cache Components stays off: pages are mostly client components fed live by
// Convex, and its static-shell rules (Suspense around every URL-reading hook)
// would add friction without a real gain here.
const nextConfig: NextConfig = {
  images: {
    // Royalty-free photos used by the landing and sign-in pages (Unsplash License).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
