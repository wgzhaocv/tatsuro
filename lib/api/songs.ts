import { cacheLife, cacheTag } from "next/cache";
import {
  type ApiAlbumSong,
  type ApiSongInfo,
  type Song,
  toSongFromAlbumSong,
  toSongFromInfo,
} from "./types";

// Fixed catalog → 'max' cache profile + tags for one-shot revalidateTag('songs').

const API = process.env.NEXT_PUBLIC_API_URL;

/** An album's track list, in the order the backend returns it. */
export async function getAlbumSongs(albumId: string): Promise<Song[]> {
  "use cache";
  cacheLife("max");
  cacheTag("songs", `album-songs:${albumId}`);

  const res = await fetch(`${API}/music/album_songs/${albumId}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load songs for album ${albumId}: ${res.status} ${res.statusText}`,
    );
  }
  const list = (await res.json()) as ApiAlbumSong[];
  return list.map((s) => toSongFromAlbumSong(s, albumId));
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
