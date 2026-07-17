// Shared vocabulary of the offline system, imported by BOTH the service
// worker bundle (app/sw/*, compiled separately by @serwist/turbopack's
// esbuild) and client modules. Hard rule for everything under lib/offline/:
// zero imports, no process.env (the SW bundle defines none), no React, no
// DOM types beyond what workers also have.

/** Auto cache: written only by the SW as a byproduct of playback; LRU-evicted. */
export const AUDIO_CACHE_NAME = "audio-cache";
/** Download cache: written only by the page-side reconciler; never LRU-swept. */
export const DOWNLOAD_CACHE_NAME = "audio-download";

/** SW → page events for the auto bucket ({type:"cache-added"|"cache-removed"}). */
export const AUDIO_EVENTS_CHANNEL = "audio-cache-events";
/** Reconciler → page events for the download bucket ({type:"download-added"|"download-removed"}). */
export const DOWNLOAD_EVENTS_CHANNEL = "audio-download-events";

/**
 * Query param the reconciler appends to stream fetches so the SW passes them
 * through untouched (no background auto-caching — the client stores the body
 * itself). A param, not a header: the API worker's CORS allow-list has no
 * custom headers, so a header would fail preflight whenever no SW controls
 * the page. The param never becomes a cache key — see canonicalStreamUrl.
 */
export const DOWNLOAD_MARKER_PARAM = "offline";

/** Web Locks name: one reconcile pass across all tabs at a time. */
export const RECONCILE_LOCK = "tatsuro-downloads-reconcile";

/** Cache keys are always the canonical stream URL — marker param stripped. */
export function canonicalStreamUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.delete(DOWNLOAD_MARKER_PARAM);
  return u.href;
}
