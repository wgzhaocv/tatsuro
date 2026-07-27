"use client";

// Cloud playlist sync — the bridge between the local-first playlist store and the
// backend's POST /me/sync (whole-playlist LWW; see yamashita-api API.md §8).
// zustand stays the source of truth: we push the local snapshot on change, adopt
// the server's authoritative merge back, and hydrate any songs the merge pulled
// from another device via the SAME TanStack Query cache useSong reads (so no
// duplicate fetches). No polling — a sync only fires on connect, on app open, and
// (debounced) when the user adds/removes/edits.

import { getQueryClient } from "@/components/query-provider";
import type { AccountUser } from "@/lib/account/store";
import { useAccountStore } from "@/lib/account/store";
import { fetchSong } from "@/lib/api/client";
import type { NameLang, Song } from "@/lib/api/types";
import { useDownloadsStore } from "@/lib/downloads/store";
import { type OfflineIntentRow, toIntentRow } from "@/lib/downloads/types";
import { usePinStore } from "@/lib/pins/store";
import { type PinRow, toPinRow } from "@/lib/pins/types";
import { usePlaylistStore } from "@/lib/playlists/store";
import { toWireRows, type WirePlaylist } from "@/lib/playlists/types";
import { songQueryKey } from "@/lib/queries/song";

const API = process.env.NEXT_PUBLIC_API_URL;
const DEBOUNCE_MS = 3000;

let syncing = false;
let queued = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
// True only while a server snapshot is being written into the store, so the
// change subscription (below) doesn't mistake an adopt/hydrate for a user edit
// and bounce it straight back as another push.
let applyingRemote = false;
// Song-name language for stub hydration; kept current by the bootstrap.
let currentLang: NameLang = "en";

export function setSyncLang(lang: NameLang): void {
  currentLang = lang;
}

/** Fetch the connected user's profile (cosmetic — for the dialog). */
export async function fetchMe(): Promise<void> {
  const token = useAccountStore.getState().token;
  if (!token) return;
  try {
    const res = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return useAccountStore.getState().clear();
    if (!res.ok) return;
    useAccountStore.getState().setUser((await res.json()) as AccountUser);
  } catch {
    // Profile is non-essential; a failure here shouldn't surface as an error.
  }
}

/** Push the local snapshot, adopt the server's merged result, hydrate stubs. */
export async function syncNow(): Promise<void> {
  const token = useAccountStore.getState().token;
  if (!token) return;
  if (syncing) {
    queued = true; // coalesce: run once more after the in-flight sync settles
    return;
  }
  syncing = true;
  useAccountStore.getState().setStatus("syncing");
  try {
    const body = {
      playlists: usePlaylistStore.getState().playlists.map((p) => {
        const { playlist, songs } = toWireRows(p);
        return {
          ...playlist,
          // Tombstoned rows (deletedAt set) are in here too — that's how a
          // removal reaches the server at all; membership merges per row on
          // last-write-wins, so a song merely absent from this array reads as
          // "no news" and the server hands it back in the snapshot.
          songs: songs.map((s) => ({
            songId: s.songId,
            position: s.position,
            addedAt: s.addedAt,
            deletedAt: s.deletedAt,
          })),
        };
      }),
      // Pins ride the same request as a sibling array (whole-row LWW server-side,
      // keyed on albumId). They're albums, not songs, so they can't share the
      // playlist channel — see lib/pins/types.
      pins: usePinStore.getState().pins.map(toPinRow),
      // Offline-download intents ride along too — only the small "keep offline"
      // list syncs, never the cached bytes (each device caches locally). Backend
      // for this field is a later addition; an older server ignores it.
      downloads: useDownloadsStore.getState().intents.map(toIntentRow),
    };
    // Edit signature at push time. If it advances while this sync is in flight
    // (the user imported/edited a playlist), the push body is already stale and
    // adopt would otherwise drop the new work — we re-sync below to upload it.
    const pushedStamp = playlistEditStamp(
      usePlaylistStore.getState().playlists,
    );
    const res = await fetch(`${API}/me/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) return useAccountStore.getState().clear();
    if (!res.ok) throw new Error(`sync failed: ${res.status}`);

    const data = (await res.json()) as {
      playlists: WirePlaylist[];
      pins?: PinRow[];
      downloads?: OfflineIntentRow[];
    };
    const stubbed = withRemoteApplied(() => {
      // Only adopt a sibling array when the server actually returned it: an
      // older backend omits the field, and adopting [] would wipe local data.
      if (Array.isArray(data.pins)) {
        usePinStore.getState().adoptRemote(data.pins);
      }
      if (Array.isArray(data.downloads)) {
        useDownloadsStore.getState().adoptRemote(data.downloads);
      }
      return usePlaylistStore.getState().adoptRemote(data.playlists);
    });
    useAccountStore.getState().setStatus("idle");
    if (stubbed.length) void hydrateStubbed(stubbed);
    // A local edit landed mid-sync (its stamp is newer than what we pushed).
    // adoptRemote preserved it locally; schedule a follow-up push so the server
    // gets it too. Guards the import-during-sync data-loss race.
    if (
      playlistEditStamp(usePlaylistStore.getState().playlists) > pushedStamp
    ) {
      scheduleSync();
    }
  } catch {
    useAccountStore.getState().setStatus("error");
  } finally {
    syncing = false;
    if (queued) {
      queued = false;
      void syncNow();
    }
  }
}

/** Debounced push — the trigger for user edits (add/remove/rename/reorder). */
export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void syncNow();
  }, DEBOUNCE_MS);
}

// Every user mutation stamps updatedAt = now() on some playlist, so the max
// stamp is a cheap edit signature. Reference changes without a new stamp —
// persist.rehydrate(), hydrateSongs' metadata backfill — are not edits and
// must not schedule a push (they used to cost 1–2 redundant whole-library
// POSTs per app open).
function playlistEditStamp(playlists: { updatedAt: number }[]): number {
  let max = 0;
  for (const p of playlists) if (p.updatedAt > max) max = p.updatedAt;
  return max;
}

/** Wire a debounced push to every user playlist/pin mutation. Returns
 *  unsubscribe. Skips changes made by our own adopt/hydrate, pre-hydration
 *  writes (the bootstrap's explicit first syncNow covers those), and no-ops
 *  without a token. */
export function startAutoSync(): () => void {
  const trigger = () => {
    if (applyingRemote) return; // our own adopt writing back — not a user edit
    if (!useAccountStore.getState().token) return;
    scheduleSync();
  };
  const unsubPlaylists = usePlaylistStore.subscribe((state, prev) => {
    if (!state.hasHydrated) return;
    if (
      playlistEditStamp(state.playlists) !== playlistEditStamp(prev.playlists)
    )
      trigger();
  });
  const unsubPins = usePinStore.subscribe((state, prev) => {
    if (!state.hasHydrated) return;
    if (state.pins !== prev.pins) trigger();
  });
  const unsubDownloads = useDownloadsStore.subscribe((state, prev) => {
    if (!state.hasHydrated) return;
    if (state.intents !== prev.intents) trigger();
  });
  return () => {
    unsubPlaylists();
    unsubPins();
    unsubDownloads();
  };
}

// Fetch the songs the merge pulled from other devices through the shared query
// cache (fetchQuery dedups + honours staleTime:Infinity), then patch them into
// the entries that were stubbed. Failures leave the stub — it still plays. ids
// are deduped (a song stubbed in several playlists is one fetch).
async function hydrateStubbed(ids: string[]): Promise<void> {
  const qc = getQueryClient();
  const fetched = await Promise.all(
    [...new Set(ids)].map((id) =>
      qc
        .fetchQuery({
          queryKey: songQueryKey(id, currentLang),
          queryFn: () => fetchSong(id, currentLang),
        })
        .catch(() => null),
    ),
  );
  const songs = fetched.filter((s): s is Song => s !== null);
  if (songs.length) {
    withRemoteApplied(() => usePlaylistStore.getState().hydrateSongs(songs));
  }
}

/** Run a store write that must not be seen as a user edit by startAutoSync. */
function withRemoteApplied<T>(fn: () => T): T {
  applyingRemote = true;
  try {
    return fn();
  } finally {
    applyingRemote = false;
  }
}
