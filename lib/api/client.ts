// Client-side fetchers for TanStack Query. The server layer (albums.ts /
// songs.ts) is 'use cache' and server-only; these are the browser-safe twins
// for data the player needs after hydration. Same wire→domain mappers, same
// endpoints (the API sends access-control-allow-origin: * and month-long
// cache-control, so the browser HTTP cache does the heavy lifting).

import { type ApiSongInfo, type Song, toSongFromInfo } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL;

/** Full details for a single song (album context, duration, mv link). */
export async function fetchSong(songId: string): Promise<Song> {
  const res = await fetch(`${API}/music/${songId}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load song ${songId}: ${res.status} ${res.statusText}`,
    );
  }
  return toSongFromInfo((await res.json()) as ApiSongInfo);
}
