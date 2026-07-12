// Audio stream caching, ported from the old site. The strategy that makes
// instant playback + offline replay work together:
//
// - Cache miss: pass the original (possibly ranged) request straight through
//   so playback starts immediately, and kick off a background download of the
//   *complete* file (no Range header) into the cache. A Set dedupes
//   concurrent downloads of the same URL.
// - Cache hit: serve from cache; ranged requests are answered by slicing the
//   stored full body into a hand-built 206 Partial Content.
// - Eviction: LRU by IndexedDB-persisted access time, bounded by half the
//   storage quota (300 MB floor). Changes broadcast on "audio-cache-events"
//   so the UI's cached-indicators can live-update.

import type { RouteHandlerCallbackOptions } from "serwist";
import {
  deleteAccessTime,
  getAllAccessTimes,
  setAccessTime,
} from "./lru-cache";

export const AUDIO_CACHE_NAME = "audio-cache";

const downloadingUrls = new Set<string>();

async function getMaxCacheBytes(): Promise<number> {
  const FALLBACK = 300 * 1024 * 1024;
  try {
    const { quota } = await navigator.storage.estimate();
    return quota ? quota * 0.5 : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export const audioStreamHandler = {
  async handle({ request }: RouteHandlerCallbackOptions): Promise<Response> {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cachedResponse = await cache.match(request.url);

    if (cachedResponse) {
      setAccessTime(request.url, Date.now());

      const rangeHeader = request.headers.get("range");
      if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (rangeMatch) {
          const arrayBuffer = await cachedResponse.arrayBuffer();
          const start = Number.parseInt(rangeMatch[1], 10) || 0;
          const end =
            Number.parseInt(rangeMatch[2], 10) || arrayBuffer.byteLength - 1;
          const sliced = arrayBuffer.slice(start, end + 1);
          return new Response(sliced, {
            status: 206,
            statusText: "Partial Content",
            headers: {
              "Content-Range": `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
              "Accept-Ranges": "bytes",
              "Content-Length": sliced.byteLength.toString(),
              "Content-Type":
                cachedResponse.headers.get("Content-Type") || "audio/ogg",
            },
          });
        }
      }
      return cachedResponse;
    }

    // Miss: play now from the network, cache the full file in the background.
    const originalResponse = fetch(request.clone());

    if (!downloadingUrls.has(request.url)) {
      downloadingUrls.add(request.url);
      downloadAndCache(request.url, cache).finally(() => {
        downloadingUrls.delete(request.url);
      });
    }

    return originalResponse;
  },
};

async function downloadAndCache(url: string, cache: Cache) {
  try {
    // Evict least-recently-used entries until the new file fits the budget.
    const cacheKeys = await cache.keys();
    const maxBytes = await getMaxCacheBytes();

    let totalBytes = 0;
    const keySizes: { url: string; size: number }[] = [];
    for (const key of cacheKeys) {
      const resp = await cache.match(key);
      const size =
        Number.parseInt(resp?.headers.get("Content-Length") ?? "0", 10) || 0;
      totalBytes += size;
      keySizes.push({ url: key.url, size });
    }

    if (totalBytes >= maxBytes) {
      const accessTimes = new Map(
        (await getAllAccessTimes()).map((t) => [t.url, t.accessTime]),
      );
      keySizes.sort(
        (a, b) => (accessTimes.get(a.url) || 0) - (accessTimes.get(b.url) || 0),
      );
      const broadcast = new BroadcastChannel("audio-cache-events");
      for (const item of keySizes) {
        if (totalBytes < maxBytes) break;
        await cache.delete(item.url);
        await deleteAccessTime(item.url);
        totalBytes -= item.size;
        broadcast.postMessage({
          type: "cache-removed",
          data: { url: item.url, reason: "lru-eviction" },
        });
      }
    }

    // Fetch the complete file — explicitly without a Range header.
    const response = await fetch(new Request(url, { method: "GET" }));
    if (response.ok && response.status === 200) {
      await cache.put(url, response.clone());
      await setAccessTime(url, Date.now());
      new BroadcastChannel("audio-cache-events").postMessage({
        type: "cache-added",
        data: { url },
      });
    }
  } catch {
    // Cache population is opportunistic; playback already went through.
  }
}
