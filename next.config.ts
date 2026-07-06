import type { NextConfig } from "next";

// Backend image host, derived from the API URL so it stays a single source of truth.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).hostname : "ys-tr.withyakul.me";

const nextConfig: NextConfig = {
  // Cache Components: data is dynamic by default; lib/api caches explicitly via
  // 'use cache' + cacheLife + cacheTag. Enables use cache / cacheLife / cacheTag.
  cacheComponents: true,
  images: {
    // Only the backend serves runtime remote images. Gate/demo photos are local
    // static imports (app/**/_assets), which don't need remotePatterns.
    remotePatterns: [
      { protocol: "https", hostname: apiHost, pathname: "/stream/img/**" },
      { protocol: "https", hostname: apiHost, pathname: "/mv/thumbnail/**" },
    ],
  },
};

export default nextConfig;
