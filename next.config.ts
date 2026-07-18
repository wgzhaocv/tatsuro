import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Backend image host, derived from the API URL so it stays a single source of truth.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).hostname : "ys-tr.withyakul.me";

// MV thumbnails + video are served direct off the public bucket domain.
const mvHost = process.env.NEXT_PUBLIC_MV_HOST ?? "tatsuro-mv.withyakul.me";

const nextConfig: NextConfig = {
  // Cache Components: data is dynamic by default; lib/api caches explicitly via
  // 'use cache' + cacheLife + cacheTag. Enables use cache / cacheLife / cacheTag.
  cacheComponents: true,
  // TypeScript 7 (the native compiler) doesn't expose the JS API Next's
  // built-in checker needs — `bun run build` runs `tsc --noEmit` itself
  // before next build, so types are still enforced, just not by Next.
  typescript: { ignoreBuildErrors: true },
  // Rewrite the icon barrel imports into direct paths: the barrel re-exports
  // ~1500 modules, which dev/build otherwise parse in full and tree-shaking
  // has to unpick (Next's built-in optimize list doesn't cover phosphor).
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/dist/ssr",
    ],
  },
  images: {
    // AVIF first: covers and beach photos are photographic content, where
    // AVIF runs ~20-30% smaller than WebP at the same quality. Doubles the
    // set of unique Vercel transforms (~240 → ~500), still well inside quota.
    formats: ["image/avif", "image/webp"],
    // Only the backend serves runtime remote images. Gate/demo photos are local
    // static imports (app/**/_assets), which don't need remotePatterns.
    remotePatterns: [
      { protocol: "https", hostname: apiHost, pathname: "/stream/img/**" },
      { protocol: "https", hostname: mvHost, pathname: "/**" },
    ],
  },
};

// Serwist (Turbopack variant): the SW itself is bundled/served by
// app/serwist/[path]/route.ts; this wrapper wires the build-id plumbing.
export default withSerwist(withNextIntl(nextConfig));
