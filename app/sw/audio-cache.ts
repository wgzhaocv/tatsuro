// Audio stream caching in the service worker. Two buckets, one handler:
//
// - "audio-download" (pinned): only the page-side reconciler writes it, never
//   LRU-swept. Checked FIRST so downloaded songs serve offline and survive.
// - "audio-cache" (auto): only the SW *populates* it from the network (here),
//   LRU-evicted against a budget that shrinks as the download bucket grows. The
//   reconciler may still move entries in/out of it (promote/demote) via the
//   shared lib/offline helpers — "SW is the sole network writer", not "sole
//   writer".
//
// Cache miss (unmarked): pass the original (possibly ranged) request straight
// through so playback starts immediately, and kick off a background download
// of the *complete* file into the auto bucket. A Set dedupes concurrent
// downloads. Cache hit: serve from cache; ranged requests get a hand-built 206
// sliced from the stored full body.
//
// Reconciler requests carry ?offline=1 (DOWNLOAD_MARKER_PARAM): on a miss we
// pass them through WITHOUT auto-caching (the reconciler stores the body into
// the download bucket itself), which is what stops a download from also
// spawning a duplicate auto-cache fetch. All cache keys are the canonical URL
// (marker stripped), so marked and unmarked requests share one entry.
//
// Eviction budget + LRU + the 206 slicer live in lib/offline/* so this handler
// and the client share them (that code is worker-safe: no env, no DOM/React).
//
// Every network fetch here uses `cache: "no-store"`: audio URLs are served with
// a 30-day immutable Cache-Control, but their content CAN change under the same
// URL (a re-import fixing a bad track extraction). The Cache Storage buckets are
// the single client-side cache for audio — if the HTTP cache were consulted, a
// More-page clear would just re-fill the SW cache with the stale HTTP copy and
// the fix would never reach the listener. no-store skips the HTTP cache in both
// directions (no read, no write) while leaving CF's edge cache untouched.

import type { RouteHandlerCallbackOptions } from "serwist";
import {
  evictAutoLru,
  getAutoCacheBudget,
  sizeOf,
} from "@/lib/offline/auto-evict";
import { postCacheEvent } from "@/lib/offline/broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  canonicalStreamUrl,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_MARKER_PARAM,
} from "@/lib/offline/constants";
import { putEntry, setAccessTime } from "@/lib/offline/lru-db";
import { buildRangeResponse } from "@/lib/offline/range-response";

const downloadingUrls = new Set<string>();

export const audioStreamHandler = {
  async handle({ request }: RouteHandlerCallbackOptions): Promise<Response> {
    const url = new URL(request.url);
    const isMarked = url.searchParams.get(DOWNLOAD_MARKER_PARAM) === "1";
    const canonical = canonicalStreamUrl(request.url);

    // Download bucket first (pinned), then auto bucket.
    const downloadCache = await caches.open(DOWNLOAD_CACHE_NAME);
    let hit = await downloadCache.match(canonical, { ignoreVary: true });
    let fromAuto = false;
    const autoCache = await caches.open(AUDIO_CACHE_NAME);
    if (!hit) {
      hit = await autoCache.match(canonical, { ignoreVary: true });
      fromAuto = Boolean(hit);
    }

    if (hit) {
      // Only the auto bucket is LRU-tracked; the download bucket is immune.
      if (fromAuto) setAccessTime(canonical, Date.now());

      const rangeHeader = request.headers.get("range");
      if (rangeHeader) {
        const partial = await buildRangeResponse(hit, rangeHeader);
        if (partial) return partial;
      }
      return hit;
    }

    // Reconciler passthrough: no auto-caching side effect. Fetch the canonical
    // URL (marker stripped) so the origin never sees the param; the reconciler
    // stores the body into the download bucket itself.
    if (isMarked) {
      return fetch(canonical, { signal: request.signal, cache: "no-store" });
    }

    // Unmarked miss: play now from the network, cache the full file in the
    // background (keyed canonically).
    const originalResponse = fetch(request.clone(), { cache: "no-store" });

    if (!downloadingUrls.has(canonical)) {
      downloadingUrls.add(canonical);
      downloadAndCache(canonical, autoCache).finally(() => {
        downloadingUrls.delete(canonical);
      });
    }

    return originalResponse;
  },
};

async function downloadAndCache(url: string, cache: Cache) {
  try {
    // Make room first: evict LRU down to the (download-aware) budget.
    await evictAutoLru({ toBudget: await getAutoCacheBudget() });

    // Fetch the complete file — explicitly without a Range header.
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (response.ok && response.status === 200) {
      await cache.put(url, response.clone());
      await setAccessTime(url, Date.now());
      await putEntry({ url, bucket: "auto", bytes: sizeOf(response) });
      postCacheEvent(AUDIO_EVENTS_CHANNEL, "cache-added", url);
    }
  } catch {
    // Cache population is opportunistic; playback already went through.
  }
}
