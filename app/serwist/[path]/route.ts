import { createSerwistRoute } from "@serwist/turbopack";

// Turbopack does not support webpack plugins, so the service worker is bundled
// (via esbuild) and served through this Route Handler instead of @serwist/next.
// It ships with `Service-Worker-Allowed: /`, so /serwist/sw.js still controls
// the whole origin. Registration lives in components/sw-provider.tsx.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
