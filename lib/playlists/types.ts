// Local-first Likes + playlists. The shape here is deliberately a *superset* of
// the eventual D1 tables (see "wire projection" below): everything the backend
// will need is already captured, plus denormalized cover/album fields so a row
// renders without a refetch. When an account system lands (Backlog #1), sync is
// a dumb upload of the thin projection — no reshaping.
//
// Why local-first is safe to sync later (verified this session):
// - localStorage survives an old→new deploy on the SAME origin, so old data is
//   physically retained (migration reads it — see ./migrate).
// - songs.id is a stable TEXT PRIMARY KEY the backend never renumbers, so a
//   stored song reference still resolves against a remodeled catalog.

import type { Song } from "@/lib/api/types";

/** "liked" is the one reserved playlist (id === LIKED_ID); everything else is
 *  a user playlist with a UUID. Same structure, one table when synced. */
export type PlaylistKind = "liked" | "user";

/** The fixed id of the reserved Liked Songs list. Its display name is localized
 *  at render time (kind === "liked" → t("likedSongs")), not read from `name`. */
export const LIKED_ID = "liked";

/** One membership: a denormalized Song (cover/album baked in for render) plus
 *  when it was added (drives order, and future last-write-wins on the row).
 *  Fresh adds are always full; entries imported from the old site (see
 *  ./migrate) start thin (id + name only) and are backfilled to full on the
 *  next load by PlaylistsHydration (components/playlists/hydration). */
export type PlaylistEntry = { song: Song; addedAt: number };

export type Playlist = {
  /** LIKED_ID for the reserved list; crypto.randomUUID() for user playlists —
   *  never a sequential id, so merging several devices into one account can't
   *  collide. */
  id: string;
  kind: PlaylistKind;
  /** User playlists: the typed name. Liked: a fallback only — the UI localizes. */
  name: string;
  entries: PlaylistEntry[];
  /** Explicit cover (album-created playlists carry the album cover id); when
   *  absent the cover is derived from the first entries' song covers. */
  coverId?: string;
  /** epoch ms. */
  createdAt: number;
  /** epoch ms — bumped on every mutation; future last-write-wins conflict key. */
  updatedAt: number;
  /** epoch ms tombstone: a soft delete so the removal can propagate on sync.
   *  The list selectors filter these out. */
  deletedAt?: number;
};

// Persisted shape lands in localStorage via the store's `partialize`
// (just `{ playlists }`); the persist middleware's own `version` handles
// migrations, so no separate schema version is tracked here.

// ─────────────────────────────────────────────────────────────────────────────
// Wire projection — the thin rows the future sync uploads to D1. Documented as
// types now (no backend yet) so the local shape stays sync-ready by design:
//   playlists(id, user_id, kind, name, cover_id, created_at, updated_at, deleted_at)
//   playlist_songs(playlist_id, song_id, position, added_at, PK(playlist_id, song_id))
// Sync walks `entries` → { song.id, index → position, addedAt } and drops the
// denormalized fields (re-derivable from the catalog).
// ─────────────────────────────────────────────────────────────────────────────

export type PlaylistRow = {
  id: string;
  kind: PlaylistKind;
  name: string;
  coverId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type PlaylistSongRow = {
  playlistId: string;
  songId: string;
  position: number;
  addedAt: number;
};

/** The shape POST /me/sync exchanges in both directions (backend API.md §8): a
 *  PlaylistRow with its membership inlined. Isomorphic to toWireRows() output;
 *  the response omits playlistId from each song (it's implied by the parent). */
export type WirePlaylist = PlaylistRow & {
  songs: { songId: string; position: number; addedAt: number }[];
};

/** Flatten a playlist into the thin rows a future sync would upload. Pure — no
 *  backend call. Kept here so the projection lives next to the shape it mirrors. */
export function toWireRows(p: Playlist): {
  playlist: PlaylistRow;
  songs: PlaylistSongRow[];
} {
  return {
    playlist: {
      id: p.id,
      kind: p.kind,
      name: p.name,
      coverId: p.coverId ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt ?? null,
    },
    songs: p.entries.map((e, i) => ({
      playlistId: p.id,
      songId: e.song.id,
      position: i,
      addedAt: e.addedAt,
    })),
  };
}
