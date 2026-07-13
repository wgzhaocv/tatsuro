"use client";

// Query hooks for song data. Keys follow ['song', id] — one entry per track,
// permanently fresh (see QueryProvider): the discography doesn't change under us.

import { useQuery } from "@tanstack/react-query";
import { fetchSong } from "@/lib/api/client";
import type { NameLang, Song } from "@/lib/api/types";

export function songQueryKey(songId: string, lang: NameLang) {
  return ["song", songId, lang] as const;
}

/**
 * Full song details (album context, duration, mv link) for the track the
 * player is on. Queue entries already carry name/cover from the release
 * payload, so this fills the gaps (mvId, precise duration) in the background.
 * `lang` (from the UI locale) picks the song-name language.
 */
export function useSong(songId: string | undefined, lang: NameLang) {
  return useQuery<Song>({
    queryKey: songQueryKey(songId ?? "", lang),
    queryFn: () => fetchSong(songId as string, lang),
    enabled: !!songId,
  });
}
