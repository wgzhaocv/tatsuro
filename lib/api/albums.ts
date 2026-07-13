import { cacheLife, cacheTag } from "next/cache";
import {
  type Album,
  type AlbumDetail,
  type ApiReleaseDetail,
  type ApiReleaseListItem,
  type NameLang,
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
