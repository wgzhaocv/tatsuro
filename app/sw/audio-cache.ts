// Audio stream caching in the service worker. Two buckets, one handler:
//
// - "audio-download" (pinned): written only by the page-side reconciler, never
//   LRU-swept. Checked FIRST so downloaded songs serve offline and survive.
// - "audio-cache" (auto): written only here as a byproduct of playback,
//   LRU-evicted against a budget that shrinks as the download bucket grows.
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

import type { RouteHandlerCallbackOptions } from "serwist";
import { evictAutoLru, getAutoCacheBudget } from "@/lib/offline/auto-evict";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  canonicalStreamUrl,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_MARKER_PARAM,
} from "@/lib/offline/constants";
import { setAccessTime } from "@/lib/offline/lru-db";
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
      return fetch(new Request(canonical), { signal: request.signal });
    }

    // Unmarked miss: play now from the network, cache the full file in the
    // background (keyed canonically).
    const originalResponse = fetch(request.clone());

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
    const response = await fetch(new Request(url, { method: "GET" }));
    if (response.ok && response.status === 200) {
      await cache.put(url, response.clone());
      await setAccessTime(url, Date.now());
      const broadcast = new BroadcastChannel(AUDIO_EVENTS_CHANNEL);
      broadcast.postMessage({ type: "cache-added", data: { url } });
      broadcast.close();
    }
  } catch {
    // Cache population is opportunistic; playback already went through.
  }
}
