"use client";

import { SerwistProvider } from "@serwist/turbopack/react";

export function ServiceWorkerProvider() {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      // No SW in development — matches the old @serwist/next behavior.
      disable={process.env.NODE_ENV !== "production"}
      // Never reload when the network comes back: that would cut off audio.
      reloadOnOnline={false}
      // The SW only caches audio streams, not navigations.
      cacheOnNavigation={false}
    />
  );
}
