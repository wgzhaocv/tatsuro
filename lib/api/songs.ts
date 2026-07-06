import { cacheLife, cacheTag } from "next/cache";
import {
  type ApiAlbumSong,
  type ApiSongInfo,
  type Song,
  toSongFromAlbumSong,
  toSongFromInfo,
} from "./types";

// Fixed catalog → 'max' cache profile + tags for one-shot revalidateTag('songs').
// A "disc" (Disc.id from a release) is the unit songs are fetched by.

const API = process.env.NEXT_PUBLIC_API_URL;

/** A disc's track list, in the order the backend returns it. */
export async function getDiscSongs(discId: string): Promise<Song[]> {
  "use cache";
  cacheLife("max");
  cacheTag("songs", `disc:${discId}`);

  const res = await fetch(`${API}/music/album_songs/${discId}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load songs for disc ${discId}: ${res.status} ${res.statusText}`,
    );
  }
  const list = (await res.json()) as ApiAlbumSong[];
  return list.map((s) => toSongFromAlbumSong(s, discId));
}

/** Full details for a single song (album context, duration, mv link). */
export async function getSong(songId: string): Promise<Song> {
  "use cache";
  cacheLife("max");
  cacheTag("songs", `song:${songId}`);

  const res = await fetch(`${API}/music/${songId}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load song ${songId}: ${res.status} ${res.statusText}`,
    );
  }
  return toSongFromInfo((await res.json()) as ApiSongInfo);
}
