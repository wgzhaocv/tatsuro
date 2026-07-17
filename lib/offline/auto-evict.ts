// Auto-cache budget + LRU eviction, shared by the SW (pre-download budget
// sweep in downloadAndCache) and the page-side reconciler (QuotaExceeded
// recovery, and shrinking the auto bucket as the download bucket grows).
// Worker-safe: only caches / navigator.storage / BroadcastChannel / IDB.

import { postCacheEvent } from "./broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  DOWNLOAD_CACHE_NAME,
} from "./constants";
import { deleteAccessTime, getAllAccessTimes } from "./lru-db";

// When estimate() is unavailable, 600 MiB × 0.5 reproduces the old 300 MB
// default budget — while still shrinking once real downloads land.
const FALLBACK_QUOTA = 600 * 1024 * 1024;

/** Fallback bytes to free on a QuotaExceeded put when Content-Length is absent. */
export const MIN_QUOTA_RESERVE = 30 * 1024 * 1024;

/** Bytes of a cached response from its Content-Length (0 when absent). */
export function sizeOf(resp: Response | undefined): number {
  return Number.parseInt(resp?.headers.get("Content-Length") ?? "0", 10) || 0;
}

// Only ever read Content-Length, never the body; but match() still hands back a
// Response whose body stream the browser may buffer. Match in small batches and
// cancel each body right away so peak memory stays flat no matter how big the
// bucket is (opening a whole ~800 MB bucket at once OOM-reloads mobile Safari).
const MATCH_CONCURRENCY = 6;

async function entrySize(cache: Cache, req: Request): Promise<number> {
  const resp = await cache.match(req);
  const n = sizeOf(resp);
  await resp?.body?.cancel().catch(() => {});
  return n;
}

/** `[{url, size}]` for a bucket's keys, matched in small batches. */
async function sizeEntries(
  cache: Cache,
  keys: readonly Request[],
): Promise<{ url: string; size: number }[]> {
  const out: { url: string; size: number }[] = [];
  for (let i = 0; i < keys.length; i += MATCH_CONCURRENCY) {
    const batch = keys.slice(i, i + MATCH_CONCURRENCY);
    const sized = await Promise.all(
      batch.map(async (k) => ({ url: k.url, size: await entrySize(cache, k) })),
    );
    out.push(...sized);
  }
  return out;
}

/** Total bytes pinned in the download bucket. */
export async function getDownloadBytes(): Promise<number> {
  try {
    const cache = await caches.open(DOWNLOAD_CACHE_NAME);
    const entries = await sizeEntries(cache, await cache.keys());
    return entries.reduce((sum, e) => sum + e.size, 0);
  } catch {
    return 0;
  }
}

/**
 * Budget for the auto bucket: half of what's left after pinned downloads.
 * Pinned wins auto — the more you download, the smaller the auto budget, so
 * auto entries drain via LRU to make room.
 */
export async function getAutoCacheBudget(): Promise<number> {
  let quota = FALLBACK_QUOTA;
  try {
    const est = await navigator.storage.estimate();
    quota = est.quota ?? FALLBACK_QUOTA;
  } catch {
    // estimate() unavailable (some Safari) — fall through to the constant.
  }
  const download = await getDownloadBytes();
  return Math.max(0, quota - download) * 0.5;
}

/**
 * Evict least-recently-used entries from the auto bucket. Provide `toBudget`
 * (evict until total ≤ budget), `freeAtLeast` (evict until that many bytes are
 * freed), or both (stops once every provided condition holds). `exclude` never
 * gets evicted — used when promoting an auto entry into the download bucket so
 * the eviction can't remove the very body being promoted. Returns bytes freed.
 * Broadcasts a cache-removed event per eviction so status UIs live-update.
 */
export async function evictAutoLru(opts: {
  toBudget?: number;
  freeAtLeast?: number;
  exclude?: string;
}): Promise<number> {
  const { toBudget, freeAtLeast, exclude } = opts;
  if (toBudget == null && freeAtLeast == null) return 0;

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const entries = await sizeEntries(cache, await cache.keys());
    let total = entries.reduce((sum, e) => sum + e.size, 0);

    // Already under budget and nothing specific to free — skip the access-time
    // read + sort entirely (the common playback hot path).
    if (freeAtLeast == null && (toBudget == null || total <= toBudget))
      return 0;

    const accessTimes = new Map(
      (await getAllAccessTimes()).map((t) => [t.url, t.accessTime]),
    );
    // Oldest access first = evict first.
    entries.sort(
      (a, b) => (accessTimes.get(a.url) || 0) - (accessTimes.get(b.url) || 0),
    );

    let freed = 0;
    for (const item of entries) {
      if (item.url === exclude) continue;
      const budgetOk = toBudget == null || total <= toBudget;
      const freeOk = freeAtLeast == null || freed >= freeAtLeast;
      if (budgetOk && freeOk) break;
      await cache.delete(item.url);
      await deleteAccessTime(item.url);
      total -= item.size;
      freed += item.size;
      postCacheEvent(
        AUDIO_EVENTS_CHANNEL,
        "cache-removed",
        item.url,
        "lru-eviction",
      );
    }
    return freed;
  } catch {
    return 0;
  }
}
