// Domain model for the ys-tr.withyakul.me music API.
//
// Albums are modeled server-side as *releases*: one logical album can carry
// multiple editions (reissues, e.g. Ride on Time 1986/2002) and multiple discs
// (multi-CD sets, e.g. Opus). The backend collapses the flat album rows into this
// shape (see ../../yamashita-api); the frontend just consumes it. The release
// detail embeds each disc's tracks (with duration); getDiscSongs/getSong remain
// for other callers (a disc == one backend source album).

export type AlbumCategory = "studio" | "live" | "compilation" | "single";
export type Recording = "studio" | "live";

/** The API's song-name language (?lang). Titles are bilingual; album/release
 *  names are not. Derived from the UI locale — Chinese uses the English names. */
export type NameLang = "en" | "ja";
export function nameLang(locale: string): NameLang {
  return locale === "ja" ? "ja" : "en";
}

// Category display labels are localized in messages (the `category` namespace),
// keyed by AlbumCategory — see components/home/album-card + album/edition-view.

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

/** One disc within an edition. Maps to a backend source album; its tracks come
 *  embedded in the release detail (no per-disc fetch needed for the album screen). */
export type Disc = {
  id: string;
  number: number;
  title?: string;
  recording: Recording;
  coverFrontId: string;
  coverBackId: string;
  tracks: Song[];
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

/** URL segment for an edition (/album/:id/2002) — the year reads naturally;
 *  the edition id is the fallback for the rare year-less pressing. */
export function editionSlug(edition: Edition): string {
  return edition.year != null ? String(edition.year) : edition.id;
}

/** The edition shown at /album/:id — the backend-declared default (latest). */
export function defaultEdition(album: AlbumDetail): Edition {
  return (
    album.editions.find((e) => e.id === album.defaultEditionId) ??
    album.editions[0]
  );
}

/** Resolve an /album/:id/:edition segment back to an edition. */
export function findEdition(
  album: AlbumDetail,
  slug: string,
): Edition | undefined {
  return album.editions.find((e) => editionSlug(e) === slug || e.id === slug);
}

/** An edition flattened into queue-ready songs: the release payload keeps
 *  tracks lean, so the album name and a cover (disc's own, falling back to
 *  the edition's) are denormalized in here — the shape the player, mini bar,
 *  and MediaSession need. Every play surface should queue through this. */
export function editionQueueSongs(
  album: AlbumDetail,
  edition: Edition,
): Song[] {
  return edition.discs.flatMap((disc) =>
    disc.tracks.map((track) => ({
      ...track,
      albumName: album.name,
      coverFrontId: disc.coverFrontId || edition.coverFrontId,
      coverBackId: disc.coverBackId || edition.coverBackId,
    })),
  );
}

/** A music video. Playback streams the webm straight off the public bucket
 *  domain (no Worker in the path); download is a separate mp4 handed to the
 *  browser via mvDownloadUrl (see ./urls). */
export type Mv = {
  id: string;
  name: string;
  /** Download (mp4) size in bytes. */
  fileSize: number;
  /** Streaming (webm) size in bytes — what playback actually pulls. */
  streamSize: number;
  /** Length in seconds. */
  duration?: number;
  /** Direct video URL on the public bucket domain — for <video> playback. */
  streamUrl: string;
  /** Direct thumbnail URL on the public bucket domain. */
  thumbnailUrl: string;
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
      tracks: { id: string; originalName: string; duration?: number }[];
    }[];
  }[];
};

/** List item from /mv/list. */
export type ApiMvItem = {
  id: string;
  name: string;
  fileSize: number;
  streamSize: number;
  duration: number | null;
  streamUrl: string;
  thumbnailUrl: string;
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
  return c === "studio" || c === "live" || c === "compilation" || c === "single"
    ? c
    : undefined;
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
        tracks: d.tracks.map((t) => {
          const { trackNumber, name } = parseTrackTitle(t.originalName ?? "");
          return {
            id: t.id,
            name,
            trackNumber,
            albumId: d.discId,
            duration: t.duration,
          };
        }),
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

export function toMv(m: ApiMvItem): Mv {
  return {
    id: m.id,
    name: m.name,
    fileSize: m.fileSize,
    streamSize: m.streamSize,
    duration: m.duration ?? undefined,
    streamUrl: m.streamUrl,
    thumbnailUrl: m.thumbnailUrl,
  };
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
