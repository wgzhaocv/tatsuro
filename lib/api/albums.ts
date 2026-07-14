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
