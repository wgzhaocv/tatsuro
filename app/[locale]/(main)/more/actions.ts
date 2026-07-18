"use server";

import { songReleaseIndex } from "@/lib/api/albums";

export type CachedAlbum = {
  /** The edition holding these songs (rows are per edition, not per album). */
  id: string;
  /** Release name, with the reissue year appended ("Name (1986)") when the
   *  release has several editions — the album page's labeling convention. */
  name: string;
  year?: number;
  /** Cached song ids that belong to this edition. */
  songIds: string[];
  /** Edition ids holding them — so a pinned album's intent can be cleared too.
   *  One id now that rows are per edition; the array shape is what the clear
   *  call takes. */
  editionIds: string[];
};

/**
 * Group the device's cached song ids into the editions they belong to.
 * Auto-cached songs (a playback byproduct) carry no album id in Cache Storage,
 * so we look each up in the cached catalog reverse index (built once, memoized)
 * — the call is then just N lookups over the cached ids, not a walk of the
 * whole catalog. One entry per edition with any cached song (so a cached
 * reissue and its original show as two rows, each labeled with its year),
 * largest set first.
 */
export async function cachedAlbums(songIds: string[]): Promise<CachedAlbum[]> {
  if (songIds.length === 0) return [];
  const index = await songReleaseIndex();

  const byEdition = new Map<string, CachedAlbum>();
  for (const id of songIds) {
    const info = index[id];
    if (!info) continue;
    let row = byEdition.get(info.editionId);
    if (!row) {
      row = {
        id: info.editionId,
        name: info.editionYear
          ? `${info.name} (${info.editionYear})`
          : info.name,
        year: info.year,
        songIds: [],
        editionIds: [info.editionId],
      };
      byEdition.set(info.editionId, row);
    }
    row.songIds.push(id);
  }

  return [...byEdition.values()].sort(
    (a, b) => b.songIds.length - a.songIds.length,
  );
}
