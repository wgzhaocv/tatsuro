// Domain model for the ys-tr.withyakul.me music API.
//
// Albums are modeled server-side as *releases*: one logical album can carry
// multiple editions (reissues, e.g. Ride on Time 1986/2002) and multiple discs
// (multi-CD sets, e.g. Opus). The backend collapses the flat album rows into this
// shape (see ../../yamashita-api); the frontend just consumes it. Songs are still
// fetched per disc (a disc == one backend source album).

export type AlbumCategory = "studio" | "live" | "compilation";
export type Recording = "studio" | "live";

// ─────────────────────────────────────────────────────────────────────────────
// Domain — what the app consumes.
// ─────────────────────────────────────────────────────────────────────────────

/** Grid list item: one logical release. */
export type Album = {
  id: string;
  name: string;
  year?: number;
  category?: AlbumCategory;
  /** Cover of the default (latest) edition → coverUrl() (see ./urls). */
  coverFrontId: string;
  coverBackId: string;
  /** >1 when the release has reissue editions. */
  editionCount: number;
  /** Disc count of the default edition. */
  discCount: number;
};

/** One disc within an edition. Maps to a backend source album; fetch its songs by `id`. */
export type Disc = {
  id: string;
  number: number;
  title?: string;
  recording: Recording;
  coverFrontId: string;
  coverBackId: string;
};

/** A physical edition/pressing of a release. */
export type Edition = {
  id: string;
  label: string;
  year?: number;
  coverFrontId: string;
  coverBackId: string;
  discs: Disc[];
};

/** Full release detail (editions + discs), for the album screen + edition switch. */
export type AlbumDetail = {
  id: string;
  name: string;
  year?: number;
  category?: AlbumCategory;
  defaultEditionId: string;
  editions: Edition[];
};

/** A track. */
export type Song = {
  id: string;
  /** Display-ready title with the "01 - " track prefix stripped. */
  name: string;
  trackNumber?: number;
  albumId?: string;
  albumName?: string;
  coverFrontId?: string;
  coverBackId?: string;
  /** Length in seconds. */
  duration?: number;
  mvId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Wire shapes — exactly what the backend returns. Internal to lib/api.
// ─────────────────────────────────────────────────────────────────────────────

export type ApiReleaseListItem = {
  releaseId: string;
  name: string;
  year: number | null;
  category: string | null;
  coverFrontId: string;
  coverBackId: string;
  editionCount: number;
  discCount: number;
};

export type ApiReleaseDetail = {
  releaseId: string;
  name: string;
  year: number | null;
  category: string | null;
  defaultEditionId: string;
  editions: {
    editionId: string;
    label: string;
    year: number | null;
    coverFrontId: string;
    coverBackId: string;
    discs: {
      discId: string;
      number: number;
      title?: string;
      recording: string;
      coverFrontId: string;
      coverBackId: string;
    }[];
  }[];
};

/** Track-list item from /music/album_songs/{discId}. */
export type ApiAlbumSong = {
  id: string;
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

function asCategory(c: string | null): AlbumCategory | undefined {
  return c === "studio" || c === "live" || c === "compilation" ? c : undefined;
}

export function toAlbum(r: ApiReleaseListItem): Album {
  return {
    id: r.releaseId,
    name: r.name,
    year: r.year ?? undefined,
    category: asCategory(r.category),
    coverFrontId: r.coverFrontId,
    coverBackId: r.coverBackId,
    editionCount: r.editionCount,
    discCount: r.discCount,
  };
}

export function toAlbumDetail(r: ApiReleaseDetail): AlbumDetail {
  return {
    id: r.releaseId,
    name: r.name,
    year: r.year ?? undefined,
    category: asCategory(r.category),
    defaultEditionId: r.defaultEditionId,
    editions: r.editions.map((e) => ({
      id: e.editionId,
      label: e.label,
      year: e.year ?? undefined,
      coverFrontId: e.coverFrontId,
      coverBackId: e.coverBackId,
      discs: e.discs.map((d) => ({
        id: d.discId,
        number: d.number,
        title: d.title,
        recording: d.recording === "live" ? "live" : "studio",
        coverFrontId: d.coverFrontId,
        coverBackId: d.coverBackId,
      })),
    })),
  };
}

/** Split a raw title like "01 - Sparkle" into its track number and clean name. */
function parseTrackTitle(raw: string): { trackNumber?: number; name: string } {
  const match = raw.match(/^\s*(\d+)\s*-\s*(.*)$/);
  if (match) return { trackNumber: Number(match[1]), name: match[2].trim() };
  return { name: raw.trim() };
}

/** album_songs item → Song. discId is the disc the list was fetched for. */
export function toSongFromAlbumSong(s: ApiAlbumSong, discId: string): Song {
  const { trackNumber, name } = parseTrackTitle(s.originalName ?? "");
  return { id: s.id, name, trackNumber, albumId: discId };
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
