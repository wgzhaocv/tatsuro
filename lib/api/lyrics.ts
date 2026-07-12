// Lyrics — timed, structured JSON (not LRC): each line carries a startTime in
// float seconds plus the original text and optional ja (reading) / en
// translations. Client-safe fetcher (the player needs lyrics after
// hydration, same as ./client.ts); a 404 simply means "no lyrics yet".

const API = process.env.NEXT_PUBLIC_API_URL;

export type LyricLine = {
  /** Seconds; a line's end is the next line's start. <= 0 on every line ⇒ untimed. */
  startTime: number;
  origin: string;
  ja?: string;
  en?: string;
};

type ApiLyricsResponse = {
  lyrics?: {
    startTime: number;
    lyrics: { origin: string; ja?: string | null; en?: string | null };
  }[];
};

/** A song's lyric lines, in order. Empty array = no lyrics. */
export async function fetchLyrics(songId: string): Promise<LyricLine[]> {
  const res = await fetch(`${API}/lyrics/${songId}`);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(
      `Failed to load lyrics for ${songId}: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as ApiLyricsResponse;
  return (data.lyrics ?? []).map((l) => ({
    startTime: l.startTime,
    origin: l.lyrics.origin,
    ja: l.lyrics.ja ?? undefined,
    en: l.lyrics.en ?? undefined,
  }));
}

/** Timed = every line carries a positive timestamp (the old site's rule —
 *  partially timed data would desync, so it renders as plain text). */
export function isTimed(lines: LyricLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.startTime > 0);
}

/** The line playing at `time`: last line whose startTime has passed. */
export function currentLineIndex(lines: LyricLine[], time: number): number {
  return lines.findIndex((line, i) => {
    const next = lines[i + 1];
    return time >= line.startTime && (!next || time < next.startTime);
  });
}
