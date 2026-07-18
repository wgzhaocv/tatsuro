import { cacheLife, cacheTag } from "next/cache";
import {
  type Album,
  type AlbumDetail,
  type ApiReleaseDetail,
  type ApiReleaseListItem,
  type Edition,
  editionQueueSongs,
  type NameLang,
  type Song,
  toAlbum,
  toAlbumDetail,
} from "./types";

// The catalog is a fixed, complete discography → 'max' cache profile + tags for
// one-shot revalidateTag('albums'). Ordering, year, category, edition/disc grouping
// all live server-side (see yamashita-api); the client just maps wire → domain.

const API = process.env.NEXT_PUBLIC_API_URL;

/** All releases, in the backend's chronological order (for the grid). */
export async function getAlbums(): Promise<Album[]> {
  "use cache";
  cacheLife("max");
  cacheTag("albums");

  const res = await fetch(`${API}/music/releases`);
  if (!res.ok) {
    throw new Error(`Failed to load albums: ${res.status} ${res.statusText}`);
  }
  const { releases } = (await res.json()) as { releases: ApiReleaseListItem[] };
  return releases.map(toAlbum);
}

/** One release with its editions and discs (for the album detail screen).
 *  `lang` picks the song-name language (?lang); 'use cache' keys on it, so en
 *  and ja are cached separately (album names themselves are language-neutral). */
export async function getAlbum(
  id: string,
  lang: NameLang = "en",
): Promise<AlbumDetail> {
  "use cache";
  cacheLife("max");
  cacheTag("albums", `album:${id}`);

  const res = await fetch(`${API}/music/release/${id}?lang=${lang}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load album ${id}: ${res.status} ${res.statusText}`,
    );
  }
  return toAlbumDetail((await res.json()) as ApiReleaseDetail);
}

/** Where a song lives: its release (for display) and the edition holding it. */
export type SongReleaseInfo = {
  albumId: string;
  name: string;
  year?: number;
  editionId: string;
  /** The edition's year, set only when the release has several editions — the
   *  same rule the album page uses to label reissues ("Name (1986)"). */
  editionYear?: number;
};

/** Reverse index songId → its release + edition, built once over the whole
 *  catalog and cached. Lets a flat set of cached song ids (which carry no album
 *  id in Cache Storage) be grouped into albums with plain lookups, instead of
 *  re-walking every release on each call. Song ids are unique per disc, so one
 *  song maps to exactly one edition. */
export async function songReleaseIndex(): Promise<
  Record<string, SongReleaseInfo>
> {
  "use cache";
  cacheLife("max");
  cacheTag("albums");

  const albums = await getAlbums();
  const details = await Promise.all(albums.map((a) => getAlbum(a.id)));
  const index: Record<string, SongReleaseInfo> = {};
  for (const album of details) {
    const multiEdition = album.editions.length > 1;
    for (const edition of album.editions) {
      for (const disc of edition.discs) {
        for (const track of disc.tracks) {
          index[track.id] = {
            albumId: album.id,
            name: album.name,
            year: album.year,
            editionId: edition.id,
            editionYear:
              multiEdition && edition.year != null ? edition.year : undefined,
          };
        }
      }
    }
  }
  return index;
}

/** Locate the release + edition + queue-ready songs that hold a given source
 *  album (a disc id — what /music/{songId} returns as `albumId`). The song page
 *  needs this because the wire song only knows its disc, not the logical release
 *  (they coincide only for single-disc releases). All fetches are 'use cache'. */
export async function findReleaseByDisc(
  discId: string,
  lang: NameLang = "en",
): Promise<{ album: AlbumDetail; edition: Edition; songs: Song[] } | null> {
  "use cache";
  cacheLife("max");
  cacheTag("albums", `disc:${discId}`);

  const albums = await getAlbums();
  const details = await Promise.all(albums.map((a) => getAlbum(a.id, lang)));
  for (const album of details) {
    const edition = album.editions.find((e) =>
      e.discs.some((d) => d.id === discId),
    );
    if (edition) {
      return { album, edition, songs: editionQueueSongs(album, edition) };
    }
  }
  return null;
}
