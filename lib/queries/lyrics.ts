"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLyrics, type LyricLine } from "@/lib/api/lyrics";

/** Lyric lines for a song — ["lyrics", id], permanently fresh (fixed catalog). */
export function useLyrics(songId: string | undefined) {
  return useQuery<LyricLine[]>({
    queryKey: ["lyrics", songId ?? ""],
    queryFn: () => fetchLyrics(songId as string),
    enabled: !!songId,
  });
}
