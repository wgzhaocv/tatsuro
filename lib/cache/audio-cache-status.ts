"use client";

// A read-only mirror of which songs are available offline. The service worker
// (app/sw/audio-cache.ts) stores full audio bodies under the "audio-cache"
// Cache Storage bucket as a byproduct of playback, and broadcasts adds and
// LRU evictions on the "audio-cache-events" BroadcastChannel. Nothing here
// drives those caches — this module just seeds a Set from Cache Storage once
// and keeps it live off the broadcast, so a track row can show whether it's
// cached without every row poking Cache Storage itself.
//
// User-initiated "download this" (pinned, eviction-proof) is a separate bucket
// that isn't built yet; `CacheState` already carries the "active" case so the
// indicator gains it without a shape change. For now this only ever resolves
// "none" | "auto". Note the SW is disabled in dev (see components/sw-provider),
// so nothing is cached there and every song stays "none".

import { useSyncExternalStore } from "react";
import { songStreamUrl } from "@/lib/api/urls";

// Keep in sync with AUDIO_CACHE_NAME in app/sw/audio-cache.ts.
const AUDIO_CACHE_NAME = "audio-cache";
const EVENTS_CHANNEL = "audio-cache-events";

export type CacheState = "none" | "auto" | "active";

let cachedUrls = new Set<string>();
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  for (const fn of listeners) fn();
}

// Lazy, one-time: only wires up once something actually subscribes.
function start(): void {
  if (started || typeof window === "undefined" || !("caches" in window)) return;
  started = true;

  // Snapshot whatever the SW has already stored this session.
  caches
    .open(AUDIO_CACHE_NAME)
    .then((cache) => cache.keys())
    .then((keys) => {
      if (keys.length === 0) return;
      const next = new Set(cachedUrls);
      for (const req of keys) next.add(req.url);
      cachedUrls = next;
      emit();
    })
    .catch(() => {});

  // Live updates: the SW posts cache-added / cache-removed here.
  try {
    const channel = new BroadcastChannel(EVENTS_CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
      const { type, data } = (event.data ?? {}) as {
        type?: string;
        data?: { url?: string };
      };
      const url = data?.url;
      if (!url) return;
      const next = new Set(cachedUrls);
      if (type === "cache-added") next.add(url);
      else if (type === "cache-removed") next.delete(url);
      else return;
      cachedUrls = next;
      emit();
    };
  } catch {
    // No BroadcastChannel — the seed above is still a one-shot snapshot;
    // only live updates are lost.
  }
}

function subscribe(onStoreChange: () => void): () => void {
  start();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Live offline-availability of one song. Resolves "none" | "auto" today
 *  ("active" arrives with user downloads). */
export function useSongCacheState(songId: string): CacheState {
  const url = songStreamUrl(songId);
  return useSyncExternalStore(
    subscribe,
    () => (cachedUrls.has(url) ? "auto" : "none"),
    () => "none",
  );
}
