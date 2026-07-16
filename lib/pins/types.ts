// Pinned albums — local-first, same shape discipline as lib/playlists/types.ts.
// A pin is just a reference to a release id (albums are pinned, not songs), so it
// does NOT fit the song-shaped playlist sync channel; when cloud sync lands it
// gets its own additive table + a `pins` field on POST /me/sync (see ROADMAP
// Backlog #1). The shape here is already that wire projection: a stable release
// id, an order/created key, an LWW conflict key, and a soft-delete tombstone.

/** One pinned release. `albumId` is the release id (stable TEXT PK the backend
 *  never renumbers, so it survives a catalog remodel — same guarantee playlists
 *  rely on). */
export type Pin = {
  albumId: string;
  /** epoch ms — when it was pinned; drives grid order (most-recent first). */
  pinnedAt: number;
  /** epoch ms — bumped on every mutation; future last-write-wins conflict key. */
  updatedAt: number;
  /** epoch ms tombstone: a soft delete so an unpin propagates on a future sync.
   *  The read selectors filter these out. */
  deletedAt?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Wire projection — the thin row a future sync uploads to D1. Documented now so
// the local shape stays sync-ready by design:
//   pinned_albums(user_id, album_id, pinned_at, updated_at, deleted_at,
//                 PK(user_id, album_id))
// Isomorphic to the Pin above; sync would exchange `pins: PinRow[]` alongside
// `playlists` on POST /me/sync and merge whole-row LWW keyed on updated_at.
// ─────────────────────────────────────────────────────────────────────────────

export type PinRow = {
  albumId: string;
  pinnedAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** Flatten a pin into the thin row a future sync would upload. Pure. */
export function toPinRow(p: Pin): PinRow {
  return {
    albumId: p.albumId,
    pinnedAt: p.pinnedAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
  };
}
