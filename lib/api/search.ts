// Client-side search over the whole catalog. The index is fetched once straight
// from the CF API (edge-cached, immutable) — NOT through Next/Vercel — then
// filtered in memory on every keystroke. See lib/queries/search-index.ts for the
// query hook and components/home/command-search.tsx for the UI.

import { foldForSearch } from "@/lib/text";
import { fetchJson } from "./client";
import type { NameLang, SearchAlbum, SearchIndex, SearchSong } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL;

/** The whole searchable catalog (albums + songs, names only) as one fixed doc.
 *  Hit directly so the CF edge cache — not Vercel bandwidth — serves it; the
 *  immutable Cache-Control means one real download per browser per 30 days.
 *  Language-neutral (raw ja + en), so a single cache entry serves every locale. */
export function fetchSearchIndex(): Promise<SearchIndex> {
  return fetchJson<SearchIndex>(`${API}/music/search-index`, "search index");
}

/** Fold + trim to a comparable form (see foldForSearch): a query in any
 *  case/script matches. name_en is already romaji, so romaji, kana, and English
 *  titles all hit the same normalized haystack. */
export function normalize(s: string): string {
  return foldForSearch(s).trim();
}

// Albums are capped low so the Songs section stays visible without scrolling
// when both match; songs get the taller budget (the list scrolls for the tail).
const ALBUM_CAP = 6;
const SONG_CAP = 50;

export type SearchResults = { albums: SearchAlbum[]; songs: SearchSong[] };

// Folding runs per haystack: doing it inside the keystroke filter cost ~2000
// normalize() calls (each a lowercase + kana regex pass) per key. Fold each
// row once per fetched index instead — the WeakMap keys on the index object,
// so a refetched index just re-folds and the old one is collected. A song's
// three names share one haystack ("\n"-joined; queries never contain one).
type Folded = {
  albums: [string, SearchAlbum][];
  songs: [string, SearchSong][];
};
const foldedCache = new WeakMap<SearchIndex, Folded>();

function foldedIndex(index: SearchIndex): Folded {
  let folded = foldedCache.get(index);
  if (!folded) {
    folded = {
      albums: index.albums.map((a) => [normalize(a.name), a]),
      songs: index.songs.map((s) => [
        `${normalize(s.ja)}\n${normalize(s.en)}\n${normalize(s.n)}`,
        s,
      ]),
    };
    foldedCache.set(index, folded);
  }
  return folded;
}

/** In-memory substring search. Albums match their name; songs match ja / en /
 *  bare name (any). Empty query → no results. Capped so the palette renders only
 *  a screenful (no virtualization needed) — and the scan stops at the caps. */
export function filterIndex(
  index: SearchIndex | undefined,
  query: string,
): SearchResults {
  const q = normalize(query);
  if (!index || !q) return { albums: [], songs: [] };
  const folded = foldedIndex(index);
  const albums: SearchAlbum[] = [];
  for (const [haystack, album] of folded.albums) {
    if (!haystack.includes(q)) continue;
    albums.push(album);
    if (albums.length === ALBUM_CAP) break;
  }
  const songs: SearchSong[] = [];
  for (const [haystack, song] of folded.songs) {
    if (!haystack.includes(q)) continue;
    songs.push(song);
    if (songs.length === SONG_CAP) break;
  }
  return { albums, songs };
}

/** Song title to show, in the UI language (ja→ja, else en), with fallbacks. */
export function songTitle(s: SearchSong, lang: NameLang): string {
  const primary = lang === "ja" ? s.ja : s.en;
  const secondary = lang === "ja" ? s.en : s.ja;
  return primary.trim() || secondary.trim() || s.n;
}
