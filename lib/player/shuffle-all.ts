// "Shuffle all" — build a queue of the whole catalog, minus karaoke / backing
// tracks, from the already-fetched search index. The index is the one payload
// that holds every song in one request (names + cover + release), so it doubles
// as the source for library-wide shuffle — no extra endpoint. Karaoke cuts carry
// `k:1` (yamashita-api migration 0016) and are dropped here, never queued.
//
// Pure: it maps the index into queue-ready Songs (same shape the album rows and
// starter-mix import build). Duration is intentionally absent — the player reads
// it off the <audio> element once a track loads, exactly like a freshly added
// song. The caller turns shuffle on and hands the result to playQueue.

import { songTitle } from "@/lib/api/search";
import type { NameLang, SearchIndex, Song } from "@/lib/api/types";

/** Every shuffle-eligible song as a queue-ready Song, titled for `lang`. Karaoke
 *  / instrumental backing tracks (`k:1`) are excluded. Order is the index's own
 *  (release order); the player applies the random permutation. */
export function shuffleAllSongs(index: SearchIndex, lang: NameLang): Song[] {
  return index.songs
    .filter((s) => s.k !== 1)
    .map((s) => ({
      id: s.id,
      name: songTitle(s, lang),
      albumName: s.album,
      coverFrontId: s.cover,
    }));
}
