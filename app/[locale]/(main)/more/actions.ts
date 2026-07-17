"use server";

import { songReleaseIndex } from "@/lib/api/albums";

export type CachedAlbum = {
  id: string;
  name: string;
  year?: number;
  /** Cached song ids that belong to this album. */
  songIds: string[];
  /** Edition ids holding them — so a pinned album's intent can be cleared too. */
  editionIds: string[];
};

/**
 * Group the device's cached song ids into the albums they belong to. Auto-cached
 * songs (a playback byproduct) carry no album id in Cache Storage, so we look
 * each up in the cached catalog reverse index (built once, memoized) — the call
 * is then just N lookups over the cached ids, not a walk of the whole catalog.
 * Returns one entry per album with any cached song, largest set first.
 */
export async function cachedAlbums(songIds: string[]): Promise<CachedAlbum[]> {
  if (songIds.length === 0) return [];
  const index = await songReleaseIndex();

  const byAlbum = new Map<string, CachedAlbum>();
  for (const id of songIds) {
    const info = index[id];
    if (!info) continue;
    let album = byAlbum.get(info.albumId);
    if (!album) {
      album = {
        id: info.albumId,
        name: info.name,
        year: info.year,
        songIds: [],
        editionIds: [],
      };
      byAlbum.set(info.albumId, album);
    }
    album.songIds.push(id);
    if (!album.editionIds.includes(info.editionId))
      album.editionIds.push(info.editionId);
  }

  return [...byAlbum.values()].sort(
    (a, b) => b.songIds.length - a.songIds.length,
  );
}
