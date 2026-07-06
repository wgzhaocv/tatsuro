// Domain model + wire shapes for the ys-tr.withyakul.me music API.
//
// The old site carried two inconsistent song shapes — AlbumSong { id, originalName }
// (track lists) and SongType { songId, songName } (player/queue) — glued together by
// ad-hoc mapping scattered across components. Here we normalize both, and every raw
// endpoint payload, into ONE canonical `Song` domain model at the API boundary so the
// rest of the app never sees `originalName` / `songId` again.

// ─────────────────────────────────────────────────────────────────────────────
// Domain model — what the app consumes. Use these everywhere outside lib/api.
// ─────────────────────────────────────────────────────────────────────────────

/** An album. */
export type Album = {
  id: string;
  name: string;
  /** Cover art ids → coverUrl() (see ./urls). */
  coverFrontId: string;
  coverBackId: string;
};

/** A track. The single canonical song shape across grid, detail, player and queue. */
export type Song = {
  id: string;
  /** Display-ready title with the "01 - " track prefix stripped. */
  name: string;
  /** Track position within its album, parsed from the "01 - " prefix when present. */
  trackNumber?: number;
  albumId?: string;
  albumName?: string;
  coverFrontId?: string;
  coverBackId?: string;
  /** Length in seconds. */
  duration?: number;
  /** Present when the song has an associated music video. */
  mvId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Wire shapes — exactly what the backend returns. Internal to lib/api; map to the
// domain model with the helpers below and don't leak these outward.
// ─────────────────────────────────────────────────────────────────────────────

export type ApiAlbum = {
  albumId: string;
  albumName: string;
  coverFrontId: string;
  coverBackId: string;
};

/** Track-list item from /music/album_songs/{albumId} — intentionally minimal. */
export type ApiAlbumSong = {
  id: string;
  /** e.g. "01 - Sparkle" — carries the track number as a prefix. */
  originalName: string;
};

/** Full single-song payload from /music/{songId}. */
export type ApiSongInfo = {
  albumId: string;
  albumName: string;
  coverFrontId: string;
  coverBackId: string;
  songId: string;
  songName: string;
  duration?: number;
  mvId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mappers — the one place wire → domain translation lives.
// ─────────────────────────────────────────────────────────────────────────────

export function toAlbum(a: ApiAlbum): Album {
  return {
    id: a.albumId,
    name: a.albumName,
    coverFrontId: a.coverFrontId,
    coverBackId: a.coverBackId,
  };
}

/** Split a raw title like "01 - Sparkle" into its track number and clean name. */
function parseTrackTitle(raw: string): { trackNumber?: number; name: string } {
  const match = raw.match(/^\s*(\d+)\s*-\s*(.*)$/);
  if (match) return { trackNumber: Number(match[1]), name: match[2].trim() };
  return { name: raw.trim() };
}

/** album_songs item → Song. albumId comes from the request that produced the list. */
export function toSongFromAlbumSong(s: ApiAlbumSong, albumId: string): Song {
  const { trackNumber, name } = parseTrackTitle(s.originalName ?? "");
  return { id: s.id, name, trackNumber, albumId };
}

/** Full /music/{id} payload → Song. */
export function toSongFromInfo(s: ApiSongInfo): Song {
  const { trackNumber, name } = parseTrackTitle(s.songName ?? "");
  return {
    id: s.songId,
    name,
    trackNumber,
    albumId: s.albumId,
    albumName: s.albumName,
    coverFrontId: s.coverFrontId,
    coverBackId: s.coverBackId,
    duration: s.duration,
    mvId: s.mvId,
  };
}
