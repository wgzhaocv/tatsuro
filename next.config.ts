import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

// Backend image host, derived from the API URL so it stays a single source of truth.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).hostname : "ys-tr.withyakul.me";

const nextConfig: NextConfig = {
  // Cache Components: data is dynamic by default; lib/api caches explicitly via
  // 'use cache' + cacheLife + cacheTag. Enables use cache / cacheLife / cacheTag.
  cacheComponents: true,
  // TypeScript 7 (the native compiler) doesn't expose the JS API Next's
  // built-in checker needs — `bun run build` runs `tsc --noEmit` itself
  // before next build, so types are still enforced, just not by Next.
  typescript: { ignoreBuildErrors: true },
  images: {
    // Only the backend serves runtime remote images. Gate/demo photos are local
    // static imports (app/**/_assets), which don't need remotePatterns.
    remotePatterns: [
      { protocol: "https", hostname: apiHost, pathname: "/stream/img/**" },
      { protocol: "https", hostname: apiHost, pathname: "/mv/thumbnail/**" },
    ],
  },
};

// Serwist (Turbopack variant): the SW itself is bundled/served by
// app/serwist/[path]/route.ts; this wrapper wires the build-id plumbing.
export default withSerwist(nextConfig);
