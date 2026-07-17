"use client";

// Offline-download *intent* as a persisted zustand store, mirroring
// lib/pins/store's conventions (skipHydration + rehydrate-after-mount,
// partialize whitelist, updatedAt/deletedAt tombstones so it's sync-ready).
// This is the declarative source of truth — "which sources should be kept
// offline". The reconciler (lib/downloads/reconciler) reads getDesiredSongIds()
// and makes the actual Cache Storage match; it is NOT stored here. When account
// sync lands it uploads toIntentRow() (see ./types) beside playlists/pins.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { usePlaylistStore } from "@/lib/playlists/store";
import type { OfflineIntent, OfflineIntentRow } from "./types";

export const DOWNLOADS_STORAGE_KEY = "tatsuro-downloads";

type DownloadsState = {
  intents: OfflineIntent[];
  /** False until the client has rehydrated. The first cloud sync waits on it so
   *  an empty snapshot can't overwrite the server. Not persisted. */
  hasHydrated: boolean;
  /** Turn offline on for a source. Albums pass a song-id snapshot; playlists
   *  omit it (resolved live). Re-enabling drops any stale row then appends. */
  setIntent(id: string, kind: OfflineIntent["kind"], songIds?: string[]): void;
  /** Turn offline off — tombstoned (soft delete) so it can propagate on sync. */
  clearIntent(id: string): void;
  setHasHydrated(v: boolean): void;
  /** Replace intents with the server's authoritative post-merge set. Rebuilt
   *  from wire rows; does NOT bump updatedAt (not a user edit → no re-sync). */
  adoptRemote(remote: OfflineIntentRow[]): void;
};

function now(): number {
  return Date.now();
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set) => ({
      intents: [],
      hasHydrated: false,

      setIntent(id, kind, songIds) {
        set((s) => {
          const t = now();
          return {
            intents: [
              ...s.intents.filter((i) => i.id !== id),
              { id, kind, songIds, enabledAt: t, updatedAt: t },
            ],
          };
        });
      },

      clearIntent(id) {
        set((s) => {
          const t = now();
          return {
            intents: s.intents.map((i) =>
              i.id === id ? { ...i, deletedAt: t, updatedAt: t } : i,
            ),
          };
        });
      },

      setHasHydrated(v) {
        set({ hasHydrated: v });
      },

      adoptRemote(remote) {
        set({
          intents: remote.map((r) => ({
            id: r.id,
            kind: r.kind,
            songIds: r.songIds ?? undefined,
            enabledAt: r.enabledAt,
            updatedAt: r.updatedAt,
            deletedAt: r.deletedAt ?? undefined,
          })),
        });
      },
    }),
    {
      name: DOWNLOADS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // SSR renders empty; the hydration mount rehydrates.
      partialize: (s) => ({ intents: s.intents }),
    },
  ),
);

// ── Reactive read hooks ──────────────────────────────────────────────────────

/** Whether a source (playlist/album id) currently has offline turned on. */
export function useIsOfflineEnabled(id: string): boolean {
  return useDownloadsStore((s) =>
    s.intents.some((i) => i.id === id && !i.deletedAt),
  );
}

// ── Non-reactive helpers for the reconciler ─────────────────────────────────

/**
 * The union of every song id that *should* be cached offline right now.
 * Playlist intents resolve live from the playlists store (so adding a song to
 * an offline playlist pulls it in); album intents use their snapshot. Read
 * outside React by the reconciler.
 */
export function getDesiredSongIds(): Set<string> {
  const desired = new Set<string>();
  const { intents } = useDownloadsStore.getState();
  const { playlists } = usePlaylistStore.getState();

  for (const intent of intents) {
    if (intent.deletedAt) continue;
    if (intent.kind === "album") {
      for (const id of intent.songIds ?? []) desired.add(id);
      continue;
    }
    const playlist = playlists.find((p) => p.id === intent.id && !p.deletedAt);
    if (!playlist) continue; // orphan — pruneOrphans tombstones it separately
    for (const entry of playlist.entries) desired.add(entry.song.id);
  }
  return desired;
}

/**
 * Tombstone playlist intents whose playlist no longer exists (deleted, or a
 * dead remote id), so a stale intent can't linger in the sync set. Album
 * intents are self-contained (snapshot) and never orphan. Called by the
 * reconciler at the top of a pass. No-op when nothing is orphaned.
 */
export function pruneOrphans(): void {
  const { intents, clearIntent } = useDownloadsStore.getState();
  const { playlists } = usePlaylistStore.getState();
  for (const intent of intents) {
    if (intent.deletedAt || intent.kind !== "playlist") continue;
    const alive = playlists.some((p) => p.id === intent.id && !p.deletedAt);
    if (!alive) clearIntent(intent.id);
  }
}
