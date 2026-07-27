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
  type PlaylistRemoval,
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
  /** Create a user playlist pre-seeded with songs, no explicit cover (the cover
   *  derives from the first entry). Backs "import a starter mix" — see
   *  ./starter-mixes. Each call is a fresh UUID, so re-importing makes a copy. */
  createPlaylistWithSongs(name: string, songs: Song[]): string;
  renamePlaylist(id: string, name: string): void;
  deletePlaylist(id: string): void;
  addSong(playlistId: string, song: Song): void;
  /** Drop a song from the list and leave a tombstone in `removed`, so the
   *  removal survives a cloud sync (membership merges per row on last-write-
   *  wins; a song simply missing from the upload reads as "no news" and comes
   *  back in the next snapshot). */
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

/** A partial that drops one song's tombstone — a re-add supersedes its removal,
 *  so the fresh addedAt becomes the only clock the merge sees for that row.
 *  Returns nothing to spread when there was no tombstone. */
function clearTombstone(p: Playlist, songId: string): Partial<Playlist> {
  if (!p.removed?.some((r) => r.songId === songId)) return {};
  return { removed: p.removed.filter((r) => r.songId !== songId) };
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

      createPlaylistWithSongs(name, songs) {
        const id = newId();
        const t = now();
        set((s) => ({
          playlists: [
            ...s.playlists,
            {
              id,
              kind: "user",
              name: name.trim(),
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
              : {
                  ...p,
                  entries: [...p.entries, { song, addedAt: now() }],
                  ...clearTombstone(p, song.id),
                },
          ),
        }));
      },

      removeSong(playlistId, songId) {
        set((s) => ({
          playlists: patch(
            s.playlists,
            playlistId,
            (p) =>
              p.entries.some((e) => e.song.id === songId)
                ? {
                    ...p,
                    entries: p.entries.filter((e) => e.song.id !== songId),
                    // A tombstone, not a plain drop — see the interface note.
                    removed: [
                      ...(p.removed ?? []).filter((r) => r.songId !== songId),
                      { songId, deletedAt: now() },
                    ],
                  }
                : p, // not in the list — nothing to tombstone
          ),
        }));
      },

      restoreSong(playlistId, entry, index) {
        set((s) => ({
          playlists: patch(s.playlists, playlistId, (p) => {
            if (p.entries.some((e) => e.song.id === entry.song.id)) return p;
            const entries = [...p.entries];
            // Re-dated: the undo has to out-stamp the tombstone the remove just
            // wrote, or a sync racing the toast would delete the song again.
            entries.splice(index, 0, { ...entry, addedAt: now() });
            return { ...p, entries, ...clearTombstone(p, entry.song.id) };
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
              // A tombstoned song stays gone: the legacy import must not undo a
              // removal (and nothing may sit in `entries` and `removed` at once).
              for (const r of existing.removed ?? []) seen.add(r.songId);
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
        const local = get().playlists;
        const localById = new Map(local.map((p) => [p.id, p]));
        const known = new Map<string, Song>();
        for (const p of local)
          for (const e of p.entries) known.set(e.song.id, e.song);

        const stubbed: string[] = [];
        const adopted: Playlist[] = remote.map((r) => {
          const mine = localById.get(r.id);

          // Membership merges per song on last-write-wins over
          // max(addedAt, deletedAt) — the same rule the server applies, so both
          // sides converge. The snapshot is authoritative for everything it has
          // already merged, but an edit made while this sync was in flight
          // isn't in it yet; merging rather than replacing is what stops adopt
          // from silently undoing that edit (a removal, most visibly).
          type Row = { addedAt: number; deletedAt?: number; position: number };
          const stamp = (row: Row) => Math.max(row.addedAt, row.deletedAt ?? 0);
          const rows = new Map<string, Row>();
          for (const s of r.songs) {
            rows.set(s.songId, {
              addedAt: s.addedAt,
              ...(s.deletedAt != null && { deletedAt: s.deletedAt }),
              position: s.position,
            });
          }
          // Equal clocks: the tombstone wins. Two writes stamped the same
          // millisecond can't be ordered, and of the two possible mistakes,
          // resurrecting a song the user deleted is the one they'd notice.
          // Re-adding it is always still possible; it just needs a newer stamp
          // (which is why restoreSong re-dates the entry it puts back).
          const beats = (row: Row, prev: Row) =>
            stamp(row) !== stamp(prev)
              ? stamp(row) > stamp(prev)
              : row.deletedAt != null && prev.deletedAt == null;
          const claim = (songId: string, row: Row) => {
            const prev = rows.get(songId);
            if (!prev || beats(row, prev)) rows.set(songId, row);
          };
          // Local rows the snapshot hasn't seen sort after everything it has.
          let tail = r.songs.length;
          for (const e of mine?.entries ?? []) {
            claim(e.song.id, {
              addedAt: e.addedAt,
              position: rows.get(e.song.id)?.position ?? tail++,
            });
          }
          for (const t of mine?.removed ?? []) {
            // addedAt 0: a tombstone's clock is its deletedAt, and the original
            // add time is of no further use once the row is dead.
            claim(t.songId, {
              addedAt: 0,
              deletedAt: t.deletedAt,
              position: 0,
            });
          }

          const live: { entry: PlaylistEntry; position: number }[] = [];
          const removed: PlaylistRemoval[] = [];
          for (const [songId, row] of rows) {
            if (row.deletedAt != null) {
              removed.push({ songId, deletedAt: row.deletedAt });
              continue;
            }
            const song = known.get(songId);
            if (!song) stubbed.push(songId);
            live.push({
              entry: {
                song: song ?? { id: songId, name: "" },
                addedAt: row.addedAt,
              },
              position: row.position,
            });
          }

          // Metadata is whole-row LWW, again matching the server. Holding the
          // local side when it is newer preserves a rename/delete made mid-sync
          // — and preserves the newer updatedAt, which is the signal sync.ts
          // reads to schedule the follow-up push that carries it to the server.
          const meta = mine && mine.updatedAt > r.updatedAt ? mine : r;
          return {
            id: r.id,
            kind: meta.kind,
            name: meta.name,
            coverId: meta.coverId ?? undefined,
            createdAt: r.createdAt,
            updatedAt: meta.updatedAt,
            ...(meta.deletedAt != null && { deletedAt: meta.deletedAt }),
            ...(removed.length > 0 && { removed }),
            entries: live
              .sort((a, b) => a.position - b.position)
              .map((x) => x.entry),
          };
        });

        // Keep local playlists the server snapshot doesn't include — these are
        // created/imported locally between this sync's push snapshot and its
        // response, and haven't uploaded yet. The server never hard-deletes (a
        // removed playlist stays as a deletedAt tombstone in the snapshot), so an
        // id absent from `remote` is always a pending local-only one. A blind
        // replace here dropped them — that's how a just-imported playlist got
        // wiped before it could sync. They upload on the next sync cycle.
        const remoteIds = new Set(remote.map((r) => r.id));
        const localOnly = local.filter((p) => !remoteIds.has(p.id));

        set({ playlists: [...adopted, ...localOnly] });
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
