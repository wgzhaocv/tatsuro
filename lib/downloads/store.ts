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
   *  omit it (resolved live). `label` is the source's display name, kept local
   *  for the More page's saved-sources list. Re-enabling drops any stale row
   *  then appends. */
  setIntent(
    id: string,
    kind: OfflineIntent["kind"],
    songIds?: string[],
    label?: string,
  ): void;
  /** Turn offline off — tombstoned (soft delete) so it can propagate on sync. */
  clearIntent(id: string): void;
  setHasHydrated(v: boolean): void;
  /** Replace intents with the server's authoritative post-merge set. Rebuilt
   *  from wire rows; does NOT bump updatedAt (not a user edit → no re-sync).
   *  `discardLocalOnly` drops intents the snapshot lacks rather than keeping them
   *  as pending uploads — only the login pull wants that (see lib/account/sync). */
  adoptRemote(
    remote: OfflineIntentRow[],
    opts?: { discardLocalOnly?: boolean },
  ): void;
};

function now(): number {
  return Date.now();
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set) => ({
      intents: [],
      hasHydrated: false,

      setIntent(id, kind, songIds, label) {
        set((s) => {
          const t = now();
          return {
            intents: [
              ...s.intents.filter((i) => i.id !== id),
              { id, kind, songIds, label, enabledAt: t, updatedAt: t },
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

      adoptRemote(remote, opts) {
        set((s) => {
          // `label` is local-only (never on the wire), so carry over the label
          // this device already has for each id — otherwise adopting the merged
          // set would blank the saved-sources names on the very device that set
          // them. A row this device hasn't seen (from a peer) has no label and
          // falls back to a generic name in the More page, which is expected.
          const localLabel = new Map(s.intents.map((i) => [i.id, i.label]));
          const adopted = remote.map((r) => ({
            id: r.id,
            kind: r.kind,
            songIds: r.songIds ?? undefined,
            label: localLabel.get(r.id),
            enabledAt: r.enabledAt,
            updatedAt: r.updatedAt,
            deletedAt: r.deletedAt ?? undefined,
          }));
          // Keep intents the server snapshot lacks — enabled locally mid-sync,
          // not uploaded yet. A blind replace would drop them (same data-loss
          // race as playlists); they upload on the next sync.
          const remoteIds = new Set(remote.map((r) => r.id));
          const localOnly = opts?.discardLocalOnly
            ? []
            : s.intents.filter((i) => !remoteIds.has(i.id));
          return { intents: [...adopted, ...localOnly] };
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
  for (const intent of intents) {
    if (intent.deletedAt) continue;
    for (const id of intentSongIds(intent)) desired.add(id);
  }
  return desired;
}

/**
 * The song ids one intent pins right now: albums use their toggle-time snapshot;
 * playlists resolve live from the playlists store (so membership edits flow
 * through), and an orphaned playlist resolves to none (pruneOrphans tombstones
 * it separately). Shared by getDesiredSongIds (the reconciler) and the More
 * page's cache accounting so "which songs a source pins" has one definition.
 */
export function intentSongIds(intent: OfflineIntent): string[] {
  if (intent.kind === "album") return intent.songIds ?? [];
  const { playlists } = usePlaylistStore.getState();
  const playlist = playlists.find((p) => p.id === intent.id && !p.deletedAt);
  return playlist ? playlist.entries.map((e) => e.song.id) : [];
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
