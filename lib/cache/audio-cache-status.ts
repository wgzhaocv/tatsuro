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

// Mutated in place: the exposed snapshot is a plain string, so referential
// stability of the Sets is irrelevant and emit() forces the re-read.
const cachedUrls = new Set<string>();
const downloadedUrls = new Set<string>();
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  for (const fn of listeners) fn();
}

async function seed(bucket: string, urls: Set<string>): Promise<void> {
  try {
    const cache = await caches.open(bucket);
    for (const req of await cache.keys()) urls.add(canonicalStreamUrl(req.url));
    emit();
  } catch {
    // best-effort snapshot
  }
}

function listen(
  channelName: string,
  addType: string,
  removeType: string,
  clearedType: string,
  urls: Set<string>,
): void {
  try {
    const bc = new BroadcastChannel(channelName);
    bc.onmessage = (event: MessageEvent) => {
      const { type, data } = (event.data ?? {}) as {
        type?: string;
        data?: { url?: string };
      };
      // Whole-bucket clear: one message, no url (a per-entry fan-out woke
      // every subscribed row once per cached song).
      if (type === clearedType) {
        urls.clear();
        emit();
        return;
      }
      if (!data?.url) return;
      const url = canonicalStreamUrl(data.url);
      if (type === addType) urls.add(url);
      else if (type === removeType) urls.delete(url);
      else return;
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

  seed(AUDIO_CACHE_NAME, cachedUrls);
  seed(DOWNLOAD_CACHE_NAME, downloadedUrls);
  listen(
    AUDIO_EVENTS_CHANNEL,
    "cache-added",
    "cache-removed",
    "cache-cleared",
    cachedUrls,
  );
  listen(
    DOWNLOAD_EVENTS_CHANNEL,
    "download-added",
    "download-removed",
    "download-cleared",
    downloadedUrls,
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
