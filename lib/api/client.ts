// Client-side fetchers for TanStack Query. The server layer (albums.ts /
// songs.ts) is 'use cache' and server-only; these are the browser-safe twins
// for data the player needs after hydration. Same wire→domain mappers, same
// endpoints (the API sends access-control-allow-origin: * and month-long
// cache-control, so the browser HTTP cache does the heavy lifting).

import {
  type ApiSongInfo,
  type NameLang,
  type Song,
  toSongFromInfo,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL;

/** Fetch + parse JSON from the API, throwing a labeled error on a non-2xx
 *  status. Shared by the client-side fetchers; the browser HTTP cache does the
 *  caching (the API sends CORS * + month-long immutable cache-control). */
export async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${label}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Full details for a single song (album context, duration, mv link). */
export async function fetchSong(songId: string, lang: NameLang): Promise<Song> {
  const info = await fetchJson<ApiSongInfo>(
    `${API}/music/${songId}?lang=${lang}`,
    `song ${songId}`,
  );
  return toSongFromInfo(info);
}
