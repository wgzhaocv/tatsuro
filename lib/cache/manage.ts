"use client";

// Cache management for the More page. The offline system (lib/offline/*,
// lib/downloads/*) knows how to *write* and LRU-evict, but had no way to read
// aggregate usage or clear a whole bucket / a single saved source / the covers.
// This module adds exactly that, on top of the existing primitives:
//   - three CacheStorage buckets (audio auto, audio download, cover images),
//   - navigator.storage.estimate() for the whole-origin used/quota meter,
//   - the two BroadcastChannels + the downloads store for live refresh.
// Read-side is the useCacheUsage() hook; write-side is the clear* functions.
// Everything is best-effort and browser-only (guards for SSR / no-Cache-API).

import { useCallback, useEffect, useRef, useState } from "react";
import { songIdFromStreamUrl, songStreamUrl } from "@/lib/api/urls";
import { intentSongIds, useDownloadsStore } from "@/lib/downloads/store";
import type { OfflineIntent } from "@/lib/downloads/types";
import { sizeOf } from "@/lib/offline/auto-evict";
import { postCacheEvent } from "@/lib/offline/broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  COVER_CACHE_NAME,
  canonicalStreamUrl,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_EVENTS_CHANNEL,
  RECONCILE_LOCK,
} from "@/lib/offline/constants";
import { clearAllAccessTimes, deleteAccessTime } from "@/lib/offline/lru-db";

export type BucketStats = { count: number; bytes: number };

/** One saved-offline source (album or playlist) with the bytes actually pinned
 *  for it right now. `label` is the name captured at toggle time; empty for
 *  legacy intents saved before labels existed (the UI falls back). */
export type SavedSource = {
  id: string;
  kind: OfflineIntent["kind"];
  label: string;
  count: number;
  bytes: number;
};

export type CacheUsage = {
  /** False until the first measurement resolves (skeleton gate). */
  ready: boolean;
  /** Whole-origin bytes in use / quota, from navigator.storage.estimate(). The
   *  used figure covers everything the app stores (audio + covers + IDB +
   *  localStorage), so it's ≥ the sum of the buckets below — it's the honest
   *  "space this app takes on your device" number. */
  usage: number;
  quota: number;
  /** Pinned downloads ("Save offline"), never auto-evicted. */
  download: BucketStats;
  /** Playback byproduct, auto-evicted when space runs low. */
  auto: BucketStats;
  /** Cached cover art. */
  cover: BucketStats;
  /** Per-source breakdown of the download bucket, largest first. */
  sources: SavedSource[];
  /** Cached bytes per song id (both buckets summed) — feeds the per-album clear
   *  and its size readout. Its keys are the cached song ids. */
  songBytes: Record<string, number>;
};

const EMPTY: CacheUsage = {
  ready: false,
  usage: 0,
  quota: 0,
  download: { count: 0, bytes: 0 },
  auto: { count: 0, bytes: 0 },
  cover: { count: 0, bytes: 0 },
  sources: [],
  songBytes: {},
};

function hasCaches(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/** Count + total bytes of a bucket. With `withSizes` (audio buckets) it also
 *  returns a canonical-url → bytes map used to attribute songs to sources and
 *  albums; the cover bucket skips it (nothing consumes cover sizes per-entry). */
async function statsOf(
  name: string,
  withSizes: boolean,
): Promise<{ stats: BucketStats; sizes: Map<string, number> }> {
  const sizes = new Map<string, number>();
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const each = await Promise.all(
      keys.map(async (k) => sizeOf(await cache.match(k))),
    );
    let bytes = 0;
    keys.forEach((k, i) => {
      bytes += each[i];
      if (withSizes) sizes.set(canonicalStreamUrl(k.url), each[i]);
    });
    return { stats: { count: keys.length, bytes }, sizes };
  } catch {
    return { stats: { count: 0, bytes: 0 }, sizes };
  }
}

/** Attribute the download bucket to each active saved source. */
function savedSources(downloadSizes: Map<string, number>): SavedSource[] {
  const { intents } = useDownloadsStore.getState();
  const out: SavedSource[] = [];
  for (const intent of intents) {
    if (intent.deletedAt) continue;
    let count = 0;
    let bytes = 0;
    for (const id of intentSongIds(intent)) {
      const size = downloadSizes.get(canonicalStreamUrl(songStreamUrl(id)));
      if (size !== undefined) {
        count += 1;
        bytes += size;
      }
    }
    out.push({
      id: intent.id,
      kind: intent.kind,
      label: intent.label ?? "",
      count,
      bytes,
    });
  }
  return out.sort((a, b) => b.bytes - a.bytes);
}

/** navigator.storage.estimate(), 0/0 when unavailable (older Safari). */
async function estimate(): Promise<{ usage: number; quota: number }> {
  try {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

async function measure(): Promise<CacheUsage> {
  // No Cache API (very old browser / SSR): resolve as ready with zeros rather
  // than leaving the panel stuck on its loading skeleton forever.
  if (!hasCaches()) return { ...EMPTY, ready: true };
  const [dl, au, cover, { usage, quota }] = await Promise.all([
    statsOf(DOWNLOAD_CACHE_NAME, true),
    statsOf(AUDIO_CACHE_NAME, true),
    statsOf(COVER_CACHE_NAME, false),
    estimate(),
  ]);
  const songBytes: Record<string, number> = {};
  for (const [url, bytes] of [...dl.sizes, ...au.sizes]) {
    const id = songIdFromStreamUrl(url);
    if (id) songBytes[id] = (songBytes[id] ?? 0) + bytes;
  }

  return {
    ready: true,
    usage,
    quota,
    download: dl.stats,
    auto: au.stats,
    cover: cover.stats,
    sources: savedSources(dl.sizes),
    songBytes,
  };
}

// ── Clear operations ────────────────────────────────────────────────────────

/** Nuke a whole audio bucket and tell status UIs each entry is gone. */
async function clearAudioBucket(
  name: string,
  channel: string,
  removeType: string,
): Promise<void> {
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    await caches.delete(name);
    for (const k of keys) postCacheEvent(channel, removeType, k.url, "cleared");
  } catch {
    // best-effort
  }
}

/**
 * Run a cache-mutating clear as the sole writer, coordinated with the reconciler
 * through its Web Lock so a concurrent reconcile pass can't demote/promote
 * entries out from under the delete. The reconciler takes the lock with
 * `ifAvailable`, so a pass triggered while we hold it just skips and retries via
 * its own triggers afterward — no deadlock, no interleaved bucket writes. Where
 * Web Locks are unavailable (older Safari) it runs directly (single-threaded
 * page; the reconciler there is best-effort too).
 */
function withReconcileLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(RECONCILE_LOCK, fn);
  }
  return fn();
}

/** Delete specific songs from both audio buckets (a pinned song may also sit in
 *  the auto bucket) + their LRU rows, broadcasting each removal. The shared core
 *  of every per-song clear — always invoked under withReconcileLock. */
async function clearSongs(songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;
  try {
    const [dl, au] = await Promise.all([
      caches.open(DOWNLOAD_CACHE_NAME),
      caches.open(AUDIO_CACHE_NAME),
    ]);
    for (const id of songIds) {
      const url = canonicalStreamUrl(songStreamUrl(id));
      if (await dl.delete(url))
        postCacheEvent(
          DOWNLOAD_EVENTS_CHANNEL,
          "download-removed",
          url,
          "cleared",
        );
      if (await au.delete(url)) {
        postCacheEvent(AUDIO_EVENTS_CHANNEL, "cache-removed", url, "cleared");
        await deleteAccessTime(url);
      }
    }
  } catch {
    // best-effort
  }
}

/** Tombstone active intents (all, or those matching `ids`), so the reconciler
 *  stops desiring them — aborting in-flight fetches and releasing its lock
 *  quickly — before we take the lock to delete. */
function dropIntents(ids?: Set<string>): void {
  const { intents, clearIntent } = useDownloadsStore.getState();
  for (const i of intents)
    if (!i.deletedAt && (!ids || ids.has(i.id))) clearIntent(i.id);
}

/** Drop the playback (auto) cache and its LRU bookkeeping. */
export async function clearPlaybackCache(): Promise<void> {
  await withReconcileLock(async () => {
    await Promise.all([
      clearAudioBucket(AUDIO_CACHE_NAME, AUDIO_EVENTS_CHANNEL, "cache-removed"),
      clearAllAccessTimes(),
    ]);
  });
}

/** Remove every pinned download: tombstone all intents, then delete the bucket
 *  under the reconcile lock. */
export async function clearDownloads(): Promise<void> {
  dropIntents();
  await withReconcileLock(() =>
    clearAudioBucket(
      DOWNLOAD_CACHE_NAME,
      DOWNLOAD_EVENTS_CHANNEL,
      "download-removed",
    ),
  );
}

/** Drop the cached cover art. The reconciler never touches this bucket, so it
 *  needs no lock. */
export async function clearImageCache(): Promise<void> {
  try {
    await caches.delete(COVER_CACHE_NAME);
  } catch {
    // best-effort
  }
}

/** Everything: both audio buckets under one lock; covers in parallel (outside
 *  the reconciler's ownership). */
export async function clearEverything(): Promise<void> {
  dropIntents();
  await Promise.all([
    withReconcileLock(async () => {
      await Promise.all([
        clearAudioBucket(
          DOWNLOAD_CACHE_NAME,
          DOWNLOAD_EVENTS_CHANNEL,
          "download-removed",
        ),
        clearAudioBucket(
          AUDIO_CACHE_NAME,
          AUDIO_EVENTS_CHANNEL,
          "cache-removed",
        ),
        clearAllAccessTimes(),
      ]);
    }),
    clearImageCache(),
  ]);
}

/** Remove one saved source by id: tombstone its intent, then delete its songs. */
export async function clearSource(id: string): Promise<void> {
  const { intents } = useDownloadsStore.getState();
  const intent = intents.find((i) => i.id === id);
  const ids = intent ? intentSongIds(intent) : [];
  dropIntents(new Set([id]));
  await withReconcileLock(() => clearSongs(ids));
}

/** Clear one album's cached audio regardless of how it got there (playback or a
 *  pinned download). Tombstones any offline intent for its editions first (so a
 *  pinned album doesn't just re-download), then deletes the songs. */
export async function clearAlbumCache(
  songIds: string[],
  editionIds: string[],
): Promise<void> {
  dropIntents(new Set(editionIds));
  await withReconcileLock(() => clearSongs(songIds));
}

// ── Read hook ────────────────────────────────────────────────────────────────

// Last measurement, kept at module scope so re-entering the More page shows the
// previous numbers instantly (with a refreshing loader) instead of resetting to
// a skeleton every time. Survives route changes within the session; a full
// reload starts fresh (skeleton once).
let lastUsage: CacheUsage = EMPTY;

/** Live cache usage for the More page. Seeds from the last measurement, then
 *  re-measures on mount and (debounced) on any cache-event broadcast or
 *  downloads-store change, so the readout tracks background eviction, downloads
 *  finishing, and toggles made on album/playlist pages. `measuring` is true
 *  while a measurement is in flight (drives the refresh loader); `refresh`
 *  forces one after a clear. */
export function useCacheUsage(): CacheUsage & {
  measuring: boolean;
  refresh: () => void;
} {
  const [usage, setUsage] = useState<CacheUsage>(lastUsage);
  const [measuring, setMeasuring] = useState(false);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(() => {
    setMeasuring(true);
    measure().then((u) => {
      lastUsage = u;
      setUsage(u);
      setMeasuring(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(refresh, 400);
    };
    const channels: BroadcastChannel[] = [];
    try {
      for (const name of [AUDIO_EVENTS_CHANNEL, DOWNLOAD_EVENTS_CHANNEL]) {
        const bc = new BroadcastChannel(name);
        bc.onmessage = schedule;
        channels.push(bc);
      }
    } catch {
      // No BroadcastChannel — the mount measurement + manual refresh still work.
    }
    const unsub = useDownloadsStore.subscribe(schedule);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      for (const bc of channels) bc.close();
      unsub();
    };
  }, [refresh]);

  return { ...usage, measuring, refresh };
}
