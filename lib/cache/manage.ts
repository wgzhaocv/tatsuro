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
import { songStreamUrl } from "@/lib/api/urls";
import { useDownloadsStore } from "@/lib/downloads/store";
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
} from "@/lib/offline/constants";
import { clearAllAccessTimes, deleteAccessTime } from "@/lib/offline/lru-db";
import { usePlaylistStore } from "@/lib/playlists/store";

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
};

const EMPTY: CacheUsage = {
  ready: false,
  usage: 0,
  quota: 0,
  download: { count: 0, bytes: 0 },
  auto: { count: 0, bytes: 0 },
  cover: { count: 0, bytes: 0 },
  sources: [],
};

function hasCaches(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/** Count + total bytes of a bucket, plus a canonical-url → bytes map (used to
 *  attribute the download bucket to its saved sources). */
async function statsOf(
  name: string,
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
      sizes.set(canonicalStreamUrl(k.url), each[i]);
    });
    return { stats: { count: keys.length, bytes }, sizes };
  } catch {
    return { stats: { count: 0, bytes: 0 }, sizes };
  }
}

/** Song ids that belong to an intent: albums carry a snapshot; playlists
 *  resolve live from the playlists store (mirrors getDesiredSongIds). */
function intentSongIds(intent: OfflineIntent): string[] {
  if (intent.kind === "album") return intent.songIds ?? [];
  const { playlists } = usePlaylistStore.getState();
  const pl = playlists.find((p) => p.id === intent.id && !p.deletedAt);
  return pl ? pl.entries.map((e) => e.song.id) : [];
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

async function measure(): Promise<CacheUsage> {
  if (!hasCaches()) return EMPTY;
  const [dl, au, cover] = await Promise.all([
    statsOf(DOWNLOAD_CACHE_NAME),
    statsOf(AUDIO_CACHE_NAME),
    statsOf(COVER_CACHE_NAME),
  ]);
  let usage = 0;
  let quota = 0;
  try {
    const est = await navigator.storage.estimate();
    usage = est.usage ?? 0;
    quota = est.quota ?? 0;
  } catch {
    // estimate() unavailable (older Safari) — leave the meter at 0.
  }
  return {
    ready: true,
    usage,
    quota,
    download: dl.stats,
    auto: au.stats,
    cover: cover.stats,
    sources: savedSources(dl.sizes),
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

/** Drop the playback (auto) cache and its LRU bookkeeping. */
export async function clearPlaybackCache(): Promise<void> {
  await clearAudioBucket(
    AUDIO_CACHE_NAME,
    AUDIO_EVENTS_CHANNEL,
    "cache-removed",
  );
  await clearAllAccessTimes();
}

/** Remove every pinned download. Tombstones all intents first so the reconciler
 *  won't refetch, then deletes the bucket. A concurrent reconcile pass could
 *  demote a few entries into the auto bucket mid-clear; those become evictable
 *  (not a permanent leak) and clearEverything sweeps them anyway. */
export async function clearDownloads(): Promise<void> {
  const { intents, clearIntent } = useDownloadsStore.getState();
  for (const i of intents) if (!i.deletedAt) clearIntent(i.id);
  await clearAudioBucket(
    DOWNLOAD_CACHE_NAME,
    DOWNLOAD_EVENTS_CHANNEL,
    "download-removed",
  );
}

/** Drop the cached cover art. */
export async function clearImageCache(): Promise<void> {
  try {
    await caches.delete(COVER_CACHE_NAME);
  } catch {
    // best-effort
  }
}

/** Everything: downloads, playback cache, covers. */
export async function clearEverything(): Promise<void> {
  await clearDownloads();
  await clearPlaybackCache();
  await clearImageCache();
}

/** Remove one saved source: tombstone its intent, then delete its songs from
 *  both audio buckets (a pinned song may also sit in the auto bucket). */
export async function clearSource(intent: {
  id: string;
  kind: OfflineIntent["kind"];
}): Promise<void> {
  const { intents, clearIntent } = useDownloadsStore.getState();
  const full = intents.find((i) => i.id === intent.id);
  const ids = full ? intentSongIds(full) : [];
  clearIntent(intent.id);
  try {
    const [dl, au] = await Promise.all([
      caches.open(DOWNLOAD_CACHE_NAME),
      caches.open(AUDIO_CACHE_NAME),
    ]);
    for (const id of ids) {
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

// ── Read hook ────────────────────────────────────────────────────────────────

/** Live cache usage for the More page. Measures on mount, then re-measures
 *  (debounced) on any cache-event broadcast or downloads-store change, so the
 *  readout tracks background eviction, downloads finishing, and toggles made on
 *  album/playlist pages. Returns a manual `refresh` for post-clear updates. */
export function useCacheUsage(): CacheUsage & { refresh: () => void } {
  const [usage, setUsage] = useState<CacheUsage>(EMPTY);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(() => {
    measure().then(setUsage);
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

  return { ...usage, refresh };
}
