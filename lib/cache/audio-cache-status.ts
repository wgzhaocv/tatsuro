"use client";

// A read-only mirror of which songs are available offline, across both buckets:
//   - "audio-download" (pinned): written by the reconciler, never LRU-swept →
//     resolves "active" (the solid dot).
//   - "audio-cache" (auto): written by the SW as a byproduct of playback,
//     LRU-evicted → resolves "auto" (the ring).
// Nothing here drives the caches — it seeds a Set per bucket once and keeps
// them live off the two BroadcastChannels, so a track row shows offline state
// without every row poking Cache Storage itself. The reconciler runs in dev
// too (Cache API needs no SW), so "active" can appear in dev; "auto" cannot
// (the SW that fills the auto bucket is disabled in dev).

import { useSyncExternalStore } from "react";
import { songStreamUrl } from "@/lib/api/urls";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  canonicalStreamUrl,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_EVENTS_CHANNEL,
} from "@/lib/offline/constants";

export type CacheState = "none" | "auto" | "active";

let cachedUrls = new Set<string>();
let downloadedUrls = new Set<string>();
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  for (const fn of listeners) fn();
}

async function seed(bucket: string, apply: (urls: Set<string>) => void) {
  try {
    const cache = await caches.open(bucket);
    const keys = await cache.keys();
    if (keys.length === 0) return;
    const next = new Set<string>();
    for (const req of keys) next.add(canonicalStreamUrl(req.url));
    apply(next);
    emit();
  } catch {
    // best-effort snapshot
  }
}

function listen(
  channel: string,
  addType: string,
  removeType: string,
  get: () => Set<string>,
  set: (s: Set<string>) => void,
) {
  try {
    const bc = new BroadcastChannel(channel);
    bc.onmessage = (event: MessageEvent) => {
      const { type, data } = (event.data ?? {}) as {
        type?: string;
        data?: { url?: string };
      };
      if (!data?.url) return;
      const url = canonicalStreamUrl(data.url);
      const next = new Set(get());
      if (type === addType) next.add(url);
      else if (type === removeType) next.delete(url);
      else return;
      set(next);
      emit();
    };
  } catch {
    // No BroadcastChannel — the seed is still a one-shot snapshot.
  }
}

// Lazy, one-time: only wires up once something actually subscribes.
function start(): void {
  if (started || typeof window === "undefined" || !("caches" in window)) return;
  started = true;

  seed(AUDIO_CACHE_NAME, (s) => {
    cachedUrls = s;
  });
  seed(DOWNLOAD_CACHE_NAME, (s) => {
    downloadedUrls = s;
  });

  listen(
    AUDIO_EVENTS_CHANNEL,
    "cache-added",
    "cache-removed",
    () => cachedUrls,
    (s) => {
      cachedUrls = s;
    },
  );
  listen(
    DOWNLOAD_EVENTS_CHANNEL,
    "download-added",
    "download-removed",
    () => downloadedUrls,
    (s) => {
      downloadedUrls = s;
    },
  );
}

function subscribe(onStoreChange: () => void): () => void {
  start();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Live offline-availability of one song: "active" (pinned download) wins over
 *  "auto" (playback byproduct). */
export function useSongCacheState(songId: string): CacheState {
  const url = songStreamUrl(songId);
  return useSyncExternalStore(
    subscribe,
    () =>
      downloadedUrls.has(url)
        ? "active"
        : cachedUrls.has(url)
          ? "auto"
          : "none",
    () => "none",
  );
}
