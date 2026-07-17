"use client";

// TEMP / one-shot — REMOVE after it has run once in the browser.
// The 2025 「オノマトペISLAND／MOVE ON」single was re-ripped (wrong tracks);
// R2 + D1 + CF edge are fixed, but /stream/new_play/{id} is immutable and keyed
// by song id, so two client-side layers can still serve the OLD audio:
//   1. the browser HTTP cache (the immutable disk copy), and
//   2. the service worker's audio buckets (Cache Storage).
// An edge flush reaches neither. Mounted once at the app root, this runs on
// page open and, for the 6 affected song ids:
//   1. re-fetches each URL with {cache:"reload"} to overwrite the HTTP-cache
//      copy with the corrected file — do this FIRST so nothing downstream can
//      resurface stale bytes;
//   2. evicts them from both SW audio buckets (they refill fresh on next play).
// Delete this file + its import/mount in app/layout.tsx, then redeploy.

import { useEffect } from "react";
import { songStreamUrl } from "@/lib/api/urls";
import { postCacheEvent } from "@/lib/offline/broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_EVENTS_CHANNEL,
} from "@/lib/offline/constants";
import { deleteAccessTime } from "@/lib/offline/lru-db";

// オノマトペISLAND／MOVE ON [Standard] — re-ripped song ids.
const STALE_SONG_IDS = [
  "7890012804109657", // 01 オノマトペISLAND
  "7256724114919295", // 02 MOVE ON
  "7015192161926887", // 03 Santé
  "7069350906839511", // 04 オノマトペISLAND (KARAOKE)
  "7700595740394042", // 05 MOVE ON (KARAOKE)
  "7628899533975082", // 06 Santé (KARAOKE)
];
const STALE_ID_SET = new Set(STALE_SONG_IDS);

const BUCKETS: [string, string, string][] = [
  [AUDIO_CACHE_NAME, AUDIO_EVENTS_CHANNEL, "cache-removed"],
  [DOWNLOAD_CACHE_NAME, DOWNLOAD_EVENTS_CHANNEL, "download-removed"],
];

const DONE_FLAG = "onoma-rerip-purged-v1";

function songIdFromStreamUrl(rawUrl: string): string | null {
  try {
    const m = new URL(rawUrl).pathname.match(/\/stream\/new_play\/([^/]+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function OnomatopeCachePurge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    if (localStorage.getItem(DONE_FLAG)) return;
    let cancelled = false;

    (async () => {
      // 1) Refresh the immutable HTTP-cache copy with the corrected audio.
      //    Consume the body so the browser actually stores the full response.
      await Promise.all(
        STALE_SONG_IDS.map((id) =>
          fetch(songStreamUrl(id), { cache: "reload" })
            .then((r) => r.blob())
            .catch(() => {}),
        ),
      );
      if (cancelled) return;

      // 2) Evict the stale entries from both SW audio buckets.
      let purged = 0;
      for (const [bucket, channel, removeType] of BUCKETS) {
        try {
          const cache = await caches.open(bucket);
          for (const req of await cache.keys()) {
            if (cancelled) return;
            const id = songIdFromStreamUrl(req.url);
            if (!id || !STALE_ID_SET.has(id)) continue;
            if (await cache.delete(req, { ignoreVary: true })) {
              await deleteAccessTime(req.url);
              postCacheEvent(channel, removeType, req.url);
              purged++;
            }
          }
        } catch {
          // best-effort; playback is unaffected either way
        }
      }

      localStorage.setItem(DONE_FLAG, "1");
      console.info(
        `[onoma-cache-purge] HTTP cache refreshed; evicted ${purged} stale SW audio entr${purged === 1 ? "y" : "ies"}`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
