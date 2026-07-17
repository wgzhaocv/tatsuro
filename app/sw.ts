/// <reference lib="webworker" />

// Service worker. Bundled by @serwist/turbopack's route handler
// (app/serwist/[path]/route.ts) and served at /serwist/sw.js — Turbopack has
// no webpack plugins, so the official @serwist/next integration doesn't apply
// here. Runtime caching: audio streams (see sw/audio-cache) and album covers
// (cache-first below); pages and static assets keep their own caching stories.

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import { sizeOf } from "@/lib/offline/auto-evict";
import { COVER_CACHE_NAME } from "@/lib/offline/constants";
import { putEntry } from "@/lib/offline/lru-db";
import { audioStreamHandler } from "./sw/audio-cache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.registerCapture(
  ({ url }) => url.pathname.includes("/stream/new_play"),
  audioStreamHandler,
);

// Album covers, cache-first. next/image renders same-origin image requests to
// /_next/image?url=<encoded backend url>&w=…&q=… — the backend cover URL rides
// inside the `url` param, so we match on it to catch only covers (not the beach
// hero photos or MV thumbnails, which also route through /_next/image). A plain
// browser refresh downgrades HTTP cache to conditional (304) round-trips; the SW
// short-circuits that with a local hit, so covers reappear instantly on reload.
//
// Fully independent of the audio cache: its own cache store, its own eviction.
// Bounded by entry count (each optimized cover is only tens of KB, so a few
// hundred is a handful of MB); purgeOnQuotaError lets it self-evict rather than
// throw if the audio cache has consumed the origin's storage budget.
serwist.registerCapture(
  ({ url }) =>
    url.pathname === "/_next/image" &&
    (url.searchParams.get("url") ?? "").includes("/stream/img/"),
  new CacheFirst({
    cacheName: COVER_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30d, mirrors the upstream max-age
        purgeOnQuotaError: true,
      }),
      // Record each cover's size in the offline metadata DB on write, so the
      // More page reads cover totals from IndexedDB like the audio buckets
      // (no cache.match). ExpirationPlugin evictions don't notify here, but the
      // More page's keys()-vs-records reconcile prunes any stale rows.
      {
        cacheDidUpdate: async ({ request, newResponse }) => {
          if (newResponse)
            await putEntry({
              url: request.url,
              bucket: "cover",
              bytes: sizeOf(newResponse),
            });
        },
      },
    ],
  }),
);

serwist.addEventListeners();
