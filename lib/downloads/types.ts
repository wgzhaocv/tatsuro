// Offline-download intent — local-first, same shape discipline as
// lib/pins/types.ts. An intent is a *declaration* ("keep this source offline"),
// not the bytes: only this small list syncs across devices; each device's
// reconciler caches the actual audio locally against it. The shape here is
// already the wire projection: a stable source id, its kind, an optional song
// snapshot (albums only), an LWW conflict key, and a soft-delete tombstone.

/** One "keep offline" declaration. */
export type OfflineIntent = {
  /** playlist.id or edition.id — the same stable contextId the queue uses. */
  id: string;
  kind: "playlist" | "album";
  /**
   * Album only: the song ids captured when the switch was flipped on. Playlists
   * are resolved live from the playlists store (membership changes should flow
   * through), but a release edition is fixed, so we snapshot it and avoid a
   * catalog fetch offline.
   */
  songIds?: string[];
  /** epoch ms — when offline was turned on. */
  enabledAt: number;
  /** epoch ms — bumped on every mutation; future last-write-wins conflict key. */
  updatedAt: number;
  /** epoch ms tombstone: a soft delete so turning offline off propagates on a
   *  future sync. Read selectors filter these out. */
  deletedAt?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Wire projection — the thin row a future sync uploads to D1:
//   offline_intents(user_id, id, kind, song_ids, enabled_at, updated_at,
//                   deleted_at, PK(user_id, id))
// Exchanged as `downloads: OfflineIntentRow[]` alongside `playlists`/`pins` on
// POST /me/sync, merged whole-row LWW keyed on updated_at.
// ─────────────────────────────────────────────────────────────────────────────

export type OfflineIntentRow = {
  id: string;
  kind: "playlist" | "album";
  songIds: string[] | null;
  enabledAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** Flatten an intent into the thin row a future sync would upload. Pure. */
export function toIntentRow(i: OfflineIntent): OfflineIntentRow {
  return {
    id: i.id,
    kind: i.kind,
    songIds: i.songIds ?? null,
    enabledAt: i.enabledAt,
    updatedAt: i.updatedAt,
    deletedAt: i.deletedAt ?? null,
  };
}
