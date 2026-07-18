"use client";

// The reconciler: makes the actual Cache Storage match the declared intent.
// Declarative, idempotent, client-only (no background sync — runs while a tab
// is open). One pass computes desired = getDesiredSongIds() and:
//   - demotes  (in download bucket, no longer desired) → move back to the auto
//     bucket so the bytes survive as evictable, then delete from download.
//   - promotes (desired, missing from download, already in auto) → copy across
//     without a network fetch, then drop the auto copy.
//   - fetches  (desired, missing everywhere) → download into the download
//     bucket, concurrency-capped, yielding to active playback.
// Failures self-heal: network failures back off and retry on a later pass;
// 404/410 are permanent; quota blocks until a demotion frees space. Single
// pass across tabs via Web Locks. Nothing is ever destroyed — un-pinning
// demotes, and reclamation is left entirely to the auto bucket's LRU.

import { useSyncExternalStore } from "react";
import { songStreamUrl } from "@/lib/api/urls";
import {
  evictAutoLru,
  getAutoCacheBudget,
  MIN_QUOTA_RESERVE,
  sizeOf,
} from "@/lib/offline/auto-evict";
import { postCacheEvent } from "@/lib/offline/broadcast";
import {
  AUDIO_CACHE_NAME,
  AUDIO_EVENTS_CHANNEL,
  canonicalStreamUrl,
  DOWNLOAD_CACHE_NAME,
  DOWNLOAD_EVENTS_CHANNEL,
  DOWNLOAD_MARKER_PARAM,
  RECONCILE_LOCK,
} from "@/lib/offline/constants";
import {
  deleteAccessTime,
  putEntry,
  setAccessTime,
} from "@/lib/offline/lru-db";
import { usePlayerStore } from "@/lib/player/store";
import { usePlaylistStore } from "@/lib/playlists/store";
import { getDesiredSongIds, pruneOrphans, useDownloadsStore } from "./store";

type FailKind = "network" | "permanent" | "quota";
type Failure = { kind: FailKind; attempts: number; nextEligibleAt: number };

const inFlight = new Map<string, AbortController>();
const failures = new Map<string, Failure>();
const downloading = new Set<string>();
const activityListeners = new Set<() => void>();

let running = false;
let scheduled = false;
let dirty = false;
let interval: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let persistRequested = false;

const RECONCILE_INTERVAL_MS = 3 * 60 * 1000;

// ── small helpers ────────────────────────────────────────────────────────────

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "QuotaExceededError";
}

function bumpAttempts(id: string): number {
  return (failures.get(id)?.attempts ?? 0) + 1;
}

function markNetworkFail(id: string) {
  const attempts = bumpAttempts(id);
  const base = Math.min(30_000 * 2 ** (attempts - 1), 30 * 60_000);
  const delay = base * (0.8 + Math.random() * 0.4); // ±20% jitter
  failures.set(id, {
    kind: "network",
    attempts,
    nextEligibleAt: Date.now() + delay,
  });
}

function eligible(id: string): boolean {
  // permanent/quota records carry nextEligibleAt = Infinity so this covers them
  // too; quota records are additionally cleared when a demotion frees space
  // (see reconcileOnce), which re-arms them.
  const f = failures.get(id);
  return !f || f.nextEligibleAt <= Date.now();
}

function setDownloading(id: string, on: boolean) {
  if (on) downloading.add(id);
  else downloading.delete(id);
  for (const l of activityListeners) l();
}

// ── bucket operations ────────────────────────────────────────────────────────

/** Move a no-longer-desired download back into the auto bucket (survives as
 *  evictable), then remove it from the download bucket. Never a network hit. */
async function demote(url: string, dl: Cache, auto: Cache) {
  try {
    const resp = await dl.match(url, { ignoreVary: true });
    if (
      resp?.status === 200 &&
      !(await auto.match(url, { ignoreVary: true }))
    ) {
      await auto.put(url, resp);
      setAccessTime(url, Date.now());
      putEntry({ url, bucket: "auto", bytes: sizeOf(resp) });
      postCacheEvent(AUDIO_EVENTS_CHANNEL, "cache-added", url);
    }
    await dl.delete(url);
    postCacheEvent(DOWNLOAD_EVENTS_CHANNEL, "download-removed", url);
  } catch {
    // best-effort; next pass retries from the recomputed actual set.
  }
}

/** Copy an already-auto-cached body into the download bucket (no network),
 *  then drop the auto copy. Returns false if the auto body vanished (caller
 *  should fetch instead) — true means handled (incl. quota-blocked). */
async function promote(
  id: string,
  url: string,
  dl: Cache,
  auto: Cache,
): Promise<boolean> {
  try {
    let resp = await auto.match(url, { ignoreVary: true });
    if (!resp || resp.status !== 200) return false;
    const size = sizeOf(resp);
    try {
      await dl.put(url, resp);
    } catch (e) {
      if (!isQuotaError(e)) return false;
      const freed = await evictAutoLru({
        freeAtLeast: size || MIN_QUOTA_RESERVE,
        exclude: url,
      });
      if (freed <= 0) {
        failures.set(id, {
          kind: "quota",
          attempts: 0,
          nextEligibleAt: Number.POSITIVE_INFINITY,
        });
        return true;
      }
      resp = await auto.match(url, { ignoreVary: true });
      if (!resp) return false;
      await dl.put(url, resp);
    }
    putEntry({ url, bucket: "download", bytes: size });
    postCacheEvent(DOWNLOAD_EVENTS_CHANNEL, "download-added", url);
    await auto.delete(url);
    deleteAccessTime(url);
    postCacheEvent(AUDIO_EVENTS_CHANNEL, "cache-removed", url, "promoted");
    failures.delete(id);
    return true;
  } catch {
    return false;
  }
}

/** Fetch one missing song into the download bucket. ?offline=1 tells a
 *  controlling SW to pass through without auto-caching; with no controller we
 *  fetch the bare canonical URL (no interception, so no duplicate). */
async function downloadOne(id: string, dl: Cache, auto: Cache) {
  const canonical = songStreamUrl(id);
  // The SW may have finished auto-caching this song after the reconcile pass
  // snapshotted the buckets (first play + pin race) — promote that copy
  // instead of downloading the whole file a second time. False means no auto
  // body to promote; fall through to the network.
  if (await promote(id, canonical, dl, auto)) return;
  const reqUrl = new URL(canonical);
  if (navigator.serviceWorker?.controller) {
    reqUrl.searchParams.set(DOWNLOAD_MARKER_PARAM, "1");
  }
  const ctrl = new AbortController();
  inFlight.set(id, ctrl);
  setDownloading(id, true);
  try {
    // no-store: skip the browser HTTP cache (30d immutable, but content can
    // change under the same URL after a re-import) — mirror of the SW handler.
    let resp = await fetch(reqUrl.href, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (resp.status === 404 || resp.status === 410) {
      failures.set(id, {
        kind: "permanent",
        attempts: 0,
        nextEligibleAt: Number.POSITIVE_INFINITY,
      });
      return;
    }
    if (resp.status !== 200) {
      markNetworkFail(id);
      return;
    }
    const size = sizeOf(resp);
    try {
      await dl.put(canonical, resp);
    } catch (e) {
      if (!isQuotaError(e)) throw e;
      const freed = await evictAutoLru({
        freeAtLeast: size || MIN_QUOTA_RESERVE,
      });
      if (freed <= 0) {
        failures.set(id, {
          kind: "quota",
          attempts: 0,
          nextEligibleAt: Number.POSITIVE_INFINITY,
        });
        return;
      }
      // body consumed by the failed put
      resp = await fetch(reqUrl.href, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!resp.ok || resp.status !== 200) {
        markNetworkFail(id);
        return;
      }
      await dl.put(canonical, resp);
    }
    putEntry({ url: canonical, bucket: "download", bytes: size });
    postCacheEvent(DOWNLOAD_EVENTS_CHANNEL, "download-added", canonical);
    // If it was also auto-cached (e.g. a race with playback), drop that copy.
    if (await auto.match(canonical, { ignoreVary: true })) {
      await auto.delete(canonical);
      deleteAccessTime(canonical);
      postCacheEvent(
        AUDIO_EVENTS_CHANNEL,
        "cache-removed",
        canonical,
        "promoted",
      );
    }
    failures.delete(id);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return; // un-pin/teardown, no penalty
    markNetworkFail(id);
  } finally {
    inFlight.delete(id);
    setDownloading(id, false);
  }
}

function runPool(queue: string[], dl: Cache, auto: Cache): Promise<void> {
  return new Promise((resolve) => {
    let active = 0;
    // Yield to playback: only one downloader while a song is streaming.
    const cap = () => (usePlayerStore.getState().isPlaying ? 1 : 2);
    const pump = () => {
      if (queue.length === 0 && active === 0) {
        resolve();
        return;
      }
      while (queue.length > 0 && active < cap()) {
        const id = queue.shift() as string;
        active++;
        downloadOne(id, dl, auto).finally(() => {
          active--;
          pump();
        });
      }
    };
    pump();
  });
}

// ── the pass ─────────────────────────────────────────────────────────────────

async function reconcileOnce() {
  if (typeof caches === "undefined") return;
  if (!useDownloadsStore.getState().hasHydrated) return;

  pruneOrphans();
  const desired = getDesiredSongIds();
  // Ask for durable storage the first time anything is actually wanted offline
  // — here rather than the switch, so a synced-in intent gets it too.
  if (!persistRequested && desired.size > 0) {
    persistRequested = true;
    navigator.storage?.persist?.().catch(() => {});
  }
  const dl = await caches.open(DOWNLOAD_CACHE_NAME);
  const auto = await caches.open(AUDIO_CACHE_NAME);
  const dlUrls = new Set(
    (await dl.keys()).map((r) => canonicalStreamUrl(r.url)),
  );
  const autoUrls = new Set(
    (await auto.keys()).map((r) => canonicalStreamUrl(r.url)),
  );
  const desiredUrls = new Set([...desired].map((id) => songStreamUrl(id)));

  // 1) Demote everything pinned but no longer desired (runs even offline).
  let demoted = 0;
  for (const url of dlUrls) {
    if (desiredUrls.has(url)) continue;
    await demote(url, dl, auto);
    demoted += 1;
  }
  if (demoted > 0) {
    await evictAutoLru({ toBudget: await getAutoCacheBudget() });
    for (const [id, f] of failures) if (f.kind === "quota") failures.delete(id);
  }

  // 2) Missing = desired − download bucket. Promote from auto first (no network).
  const missing = [...desired].filter((id) => !dlUrls.has(songStreamUrl(id)));
  const toFetch: string[] = [];
  for (const id of missing) {
    const url = songStreamUrl(id);
    if (autoUrls.has(url)) {
      const handled = await promote(id, url, dl, auto);
      if (!handled) toFetch.push(id);
    } else {
      toFetch.push(id);
    }
  }

  // 3) Fetch the rest — skip entirely offline; respect failure backoff.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  await runPool(toFetch.filter(eligible), dl, auto);
}

async function runReconcile() {
  running = true;
  try {
    const loop = async () => {
      do {
        dirty = false;
        await reconcileOnce();
      } while (dirty);
    };
    if (navigator.locks?.request) {
      await navigator.locks.request(
        RECONCILE_LOCK,
        { ifAvailable: true },
        async (lock) => {
          if (!lock) return; // another tab is reconciling — our triggers retry later
          await loop();
        },
      );
    } else {
      await loop();
    }
  } catch {
    // A whole failed pass is fine — triggers will run another.
  } finally {
    running = false;
  }
}

/** Abort in-flight fetches for songs that are no longer desired (un-pin). */
function abortUndesired() {
  if (inFlight.size === 0) return;
  const desired = getDesiredSongIds();
  for (const [id, ctrl] of inFlight) if (!desired.has(id)) ctrl.abort();
}

/** Debounced entry point for every trigger. */
function requestReconcile() {
  abortUndesired();
  if (running) {
    dirty = true;
    return;
  }
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void runReconcile();
  }, 500);
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    requestReconcile();
    interval ??= setInterval(requestReconcile, RECONCILE_INTERVAL_MS);
  } else if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

/** Wire up all triggers once. Called from the mounted reconciler component. */
export function initDownloadsReconciler() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  useDownloadsStore.subscribe((s, p) => {
    if (s.intents !== p.intents || (s.hasHydrated && !p.hasHydrated))
      requestReconcile();
  });
  usePlaylistStore.subscribe((s, p) => {
    if (s.playlists === p.playlists) return;
    // Only playlist-kind intents derive their song set from this store — with
    // none active, a like/edit can't change what's desired offline, so don't
    // pay a full pass (two bucket enumerations) for every heart click.
    const { intents } = useDownloadsStore.getState();
    if (intents.some((i) => i.kind === "playlist" && !i.deletedAt))
      requestReconcile();
  });
  window.addEventListener("online", requestReconcile);
  document.addEventListener("visibilitychange", onVisibility);
  if (document.visibilityState === "visible") {
    interval ??= setInterval(requestReconcile, RECONCILE_INTERVAL_MS);
  }

  requestReconcile();
}

// ── UI feed: is this song being fetched right now? ───────────────────────────

function subscribeActivity(cb: () => void): () => void {
  activityListeners.add(cb);
  return () => {
    activityListeners.delete(cb);
  };
}

/** Live: whether the reconciler is currently fetching this song (the track
 *  row's transitional spinner). Cached/downloaded state comes separately from
 *  useSongCacheState. */
export function useSongDownloadActivity(songId: string): boolean {
  return useSyncExternalStore(
    subscribeActivity,
    () => downloading.has(songId),
    () => false,
  );
}
