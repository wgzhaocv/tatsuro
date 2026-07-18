"use client";

// Likes + playlists as a persisted zustand store, mirroring lib/player/store's
// conventions: skipHydration + rehydrate-after-mount (SSR renders empty), a
// partialize whitelist, and full denormalized Song objects stored per entry so
// a row renders without a refetch. Pure local state — the store is the source
// of truth; no React Query, no backend. When an account lands, sync uploads the
// wire projection (see ./types toWireRows). Every mutation bumps updatedAt.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Song } from "@/lib/api/types";
import { createDebouncedLocalStorage } from "@/lib/debounced-local-storage";
import {
  LIKED_ID,
  type Playlist,
  type PlaylistEntry,
  type WirePlaylist,
} from "./types";

export const PLAYLISTS_STORAGE_KEY = "tatsuro-playlists";

type PlaylistsState = {
  playlists: Playlist[];
  /** False until the client has rehydrated (+ run legacy migration). UI gates
   *  on this so a first paint never flashes an empty library. Not persisted.
   *  Reads go through the reactive hooks at the bottom of this file. */
  hasHydrated: boolean;

  // writes (all bump updatedAt) ─────────────────────────────────────────────
  createPlaylist(name: string): string;
  createPlaylistFromAlbum(name: string, coverId: string, songs: Song[]): string;
  renamePlaylist(id: string, name: string): void;
  deletePlaylist(id: string): void;
  addSong(playlistId: string, song: Song): void;
  removeSong(playlistId: string, songId: string): void;
  /** Re-insert a removed entry at its old index — the undo for removeSong,
   *  preserving position (addSong would only append). No-op if it's back. */
  restoreSong(playlistId: string, entry: PlaylistEntry, index: number): void;
  reorder(playlistId: string, from: number, to: number): void;
  toggleLike(song: Song): void;

  // lifecycle ────────────────────────────────────────────────────────────────
  /** Add the reserved Liked list if a rehydrate left it missing (fresh visitor
   *  or a legacy import without one). Idempotent. */
  ensureLiked(): void;
  /** Merge migrated legacy playlists in (dedupe by id; liked folds into liked). */
  importLegacy(legacy: Playlist[]): void;
  setHasHydrated(v: boolean): void;

  // cloud sync (see lib/account/sync.ts) ──────────────────────────────────────
  /** Replace the library with the server's authoritative snapshot after a sync.
   *  The server merged with LWW already, so this adopts it wholesale. Entries are
   *  rebuilt from the thin rows, reusing any Song we already know by id (so this
   *  device's own playlists keep their rich cover/name/duration) and thin-stubbing
   *  the rest. Returns the song ids that had to be stubbed, for the caller to
   *  hydrate via the song cache. Does NOT bump updatedAt (not a user edit). */
  adoptRemote(remote: WirePlaylist[]): string[];
  /** Fill richer Song data into any entry matching by id (post-adopt hydration
   *  of stubbed songs). Pure metadata refresh — leaves updatedAt untouched so it
   *  never triggers a re-sync. */
  hydrateSongs(songs: Song[]): void;
};

function now(): number {
  return Date.now();
}

function newId(): string {
  return crypto.randomUUID();
}

function makeLiked(): Playlist {
  const t = now();
  // `name` is a fallback; the UI localizes liked via kind (t("likedSongs")).
  return {
    id: LIKED_ID,
    kind: "liked",
    name: "Liked Songs",
    entries: [],
    createdAt: t,
    updatedAt: t,
  };
}

/** Live (non-tombstoned) playlists, liked pinned first, then newest-first. */
function forDisplay(playlists: Playlist[]): Playlist[] {
  return playlists
    .filter((p) => !p.deletedAt)
    .sort((a, b) => {
      if (a.kind === "liked") return -1;
      if (b.kind === "liked") return 1;
      return b.createdAt - a.createdAt;
    });
}

/** Replace one playlist by id via an updater, stamping updatedAt. */
function patch(
  playlists: Playlist[],
  id: string,
  fn: (p: Playlist) => Playlist,
): Playlist[] {
  return playlists.map((p) =>
    p.id === id ? { ...fn(p), updatedAt: now() } : p,
  );
}

export const usePlaylistStore = create<PlaylistsState>()(
  persist(
    (set, get) => ({
      playlists: [],
      hasHydrated: false,

      createPlaylist(name) {
        const id = newId();
        const t = now();
        set((s) => ({
          playlists: [
            ...s.playlists,
            {
              id,
              kind: "user",
              name: name.trim(),
              entries: [],
              createdAt: t,
              updatedAt: t,
            },
          ],
        }));
        return id;
      },

      createPlaylistFromAlbum(name, coverId, songs) {
        const id = newId();
        const t = now();
        set((s) => ({
          playlists: [
            ...s.playlists,
            {
              id,
              kind: "user",
              name: name.trim(),
              coverId,
              entries: songs.map((song) => ({ song, addedAt: t })),
              createdAt: t,
              updatedAt: t,
            },
          ],
        }));
        return id;
      },

      renamePlaylist(id, name) {
        if (id === LIKED_ID) return; // liked is not renamable
        set((s) => ({
          playlists: patch(s.playlists, id, (p) => ({
            ...p,
            name: name.trim(),
          })),
        }));
      },

      deletePlaylist(id) {
        if (id === LIKED_ID) return; // liked is not deletable
        // Soft delete (tombstone) so the removal can propagate on a future sync.
        set((s) => ({
          playlists: patch(s.playlists, id, (p) => ({
            ...p,
            deletedAt: now(),
          })),
        }));
      },

      addSong(playlistId, song) {
        set((s) => ({
          playlists: patch(s.playlists, playlistId, (p) =>
            p.entries.some((e) => e.song.id === song.id)
              ? p // already in — no-op (dedupe by song id)
              : { ...p, entries: [...p.entries, { song, addedAt: now() }] },
          ),
        }));
      },

      removeSong(playlistId, songId) {
        set((s) => ({
          playlists: patch(s.playlists, playlistId, (p) => ({
            ...p,
            entries: p.entries.filter((e) => e.song.id !== songId),
          })),
        }));
      },

      restoreSong(playlistId, entry, index) {
        set((s) => ({
          playlists: patch(s.playlists, playlistId, (p) => {
            if (p.entries.some((e) => e.song.id === entry.song.id)) return p;
            const entries = [...p.entries];
            entries.splice(index, 0, entry); // splice clamps an out-of-range index
            return { ...p, entries };
          }),
        }));
      },

      reorder(playlistId, from, to) {
        set((s) => ({
          playlists: patch(s.playlists, playlistId, (p) => {
            const entries = [...p.entries];
            if (
              from < 0 ||
              to < 0 ||
              from >= entries.length ||
              to >= entries.length
            )
              return p;
            const [moved] = entries.splice(from, 1);
            entries.splice(to, 0, moved);
            return { ...p, entries };
          }),
        }));
      },

      toggleLike(song) {
        get().ensureLiked();
        const liked = get().playlists.find((p) => p.id === LIKED_ID);
        if (liked?.entries.some((e) => e.song.id === song.id))
          get().removeSong(LIKED_ID, song.id);
        else get().addSong(LIKED_ID, song);
      },

      ensureLiked() {
        if (get().playlists.some((p) => p.id === LIKED_ID)) return;
        set((s) => ({ playlists: [makeLiked(), ...s.playlists] }));
      },

      importLegacy(legacy) {
        set((s) => {
          const byId = new Map(s.playlists.map((p) => [p.id, p]));
          for (const p of legacy) {
            if (p.id === LIKED_ID) {
              // Fold legacy likes into the existing liked list (union by song id).
              const existing = byId.get(LIKED_ID) ?? makeLiked();
              const seen = new Set(existing.entries.map((e) => e.song.id));
              const merged: PlaylistEntry[] = [
                ...existing.entries,
                ...p.entries.filter((e) => !seen.has(e.song.id)),
              ];
              byId.set(LIKED_ID, {
                ...existing,
                entries: merged,
                updatedAt: now(),
              });
            } else if (!byId.has(p.id)) {
              byId.set(p.id, p);
            }
          }
          return { playlists: [...byId.values()] };
        });
      },

      adoptRemote(remote) {
        // Build a lookup of every Song we already hold, so adopted playlists
        // reuse rich local data (cover/name/duration) instead of stubs. Common
        // case (this device's own playlists round-tripping) resolves fully.
        const known = new Map<string, Song>();
        for (const p of get().playlists)
          for (const e of p.entries) known.set(e.song.id, e.song);

        const stubbed: string[] = [];
        const playlists: Playlist[] = remote.map((r) => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          coverId: r.coverId ?? undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          ...(r.deletedAt != null && { deletedAt: r.deletedAt }),
          entries: [...r.songs]
            .sort((a, b) => a.position - b.position)
            .map((s) => {
              const song = known.get(s.songId);
              if (!song) stubbed.push(s.songId);
              return {
                song: song ?? { id: s.songId, name: "" },
                addedAt: s.addedAt,
              };
            }),
        }));

        set({ playlists });
        return stubbed;
      },

      hydrateSongs(songs) {
        const bySong = new Map(songs.map((s) => [s.id, s]));
        set((s) => ({
          playlists: s.playlists.map((p) => ({
            ...p,
            entries: p.entries.map((e) => {
              const fresh = bySong.get(e.song.id);
              return fresh ? { ...e, song: fresh } : e;
            }),
          })),
        }));
      },

      setHasHydrated(v) {
        set({ hasHydrated: v });
      },
    }),
    {
      name: PLAYLISTS_STORAGE_KEY,
      version: 1,
      // Debounced: every entry stores a denormalized Song, so a like (two
      // set()s) would otherwise stringify the whole library twice per click.
      storage: createJSONStorage(createDebouncedLocalStorage),
      skipHydration: true, // SSR renders empty; the hydration mount rehydrates.
      partialize: (s) => ({ playlists: s.playlists }),
    },
  ),
);

// ── Reactive read hooks ──────────────────────────────────────────────────────
// Components read through these (not the store's imperative getState) so they
// re-render on the slice they care about. Array results use useShallow so a new
// sorted array with the same members doesn't force a render.

export function useHasHydrated(): boolean {
  return usePlaylistStore((s) => s.hasHydrated);
}

/** Live playlists, liked first — a fresh array each call, shallow-compared. */
export function useVisiblePlaylists(): Playlist[] {
  return usePlaylistStore(useShallow((s) => forDisplay(s.playlists)));
}

/** One live playlist by id (undefined if missing or tombstoned). */
export function usePlaylist(id: string): Playlist | undefined {
  return usePlaylistStore((s) => {
    const p = s.playlists.find((x) => x.id === id);
    return p && !p.deletedAt ? p : undefined;
  });
}

/** Whether a song sits in the Liked list — a boolean, so identity-compared. */
export function useIsLiked(songId: string): boolean {
  return usePlaylistStore(
    (s) =>
      !!s.playlists
        .find((p) => p.id === LIKED_ID)
        ?.entries.some((e) => e.song.id === songId),
  );
}
