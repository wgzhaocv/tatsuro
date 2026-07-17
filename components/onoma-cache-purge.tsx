"use client";

// TEMP / one-shot — REMOVE after it has run once in the browser.
// The 2025 「オノマトペISLAND／MOVE ON」single was re-ripped (wrong tracks);
// R2 + D1 + CF edge are fixed, but the service worker may still hold the OLD
// audio under the same /stream/new_play/{id} URLs (immutable, keyed by song id,
// so the edge flush can't reach the client copy). This component, mounted once
// at the app root, evicts those 6 URLs from both audio buckets on page open.
// Delete this file + its mount in app/layout.tsx, then redeploy.

import { useEffect } from "react";
import { postCacheEvent } from "@/lib/offline/broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_EVENTS_CHANNEL,
} from "@/lib/offline/constants";
import { deleteAccessTime } from "@/lib/offline/lru-db";

// オノマトペISLAND／MOVE ON [Standard] — re-ripped song ids.
const STALE_SONG_IDS = new Set([
  "7890012804109657", // 01 オノマトペISLAND
  "7256724114919295", // 02 MOVE ON
  "7015192161926887", // 03 Santé
  "7069350906839511", // 04 オノマトペISLAND (KARAOKE)
  "7700595740394042", // 05 MOVE ON (KARAOKE)
  "7628899533975082", // 06 Santé (KARAOKE)
]);

const BUCKETS: [string, string, string][] = [
  [AUDIO_CACHE_NAME, AUDIO_EVENTS_CHANNEL, "cache-removed"],
  [DOWNLOAD_CACHE_NAME, DOWNLOAD_EVENTS_CHANNEL, "download-removed"],
];

function songIdFromStreamUrl(rawUrl: string): string | null {
  try {
    const { pathname } = new URL(rawUrl);
    const m = pathname.match(/\/stream\/new_play\/([^/]+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function OnomatopeCachePurge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    let cancelled = false;

    (async () => {
      let purged = 0;
      for (const [bucket, channel, removeType] of BUCKETS) {
        try {
          const cache = await caches.open(bucket);
          for (const req of await cache.keys()) {
            if (cancelled) return;
            const id = songIdFromStreamUrl(req.url);
            if (!id || !STALE_SONG_IDS.has(id)) continue;
            const url = req.url;
            if (await cache.delete(req, { ignoreVary: true })) {
              await deleteAccessTime(url);
              postCacheEvent(channel, removeType, url);
              purged++;
            }
          }
        } catch {
          // best-effort; playback is unaffected either way
        }
      }
      if (purged > 0) {
        console.info(
          `[onoma-cache-purge] evicted ${purged} stale re-ripped audio entr${purged === 1 ? "y" : "ies"}`,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
