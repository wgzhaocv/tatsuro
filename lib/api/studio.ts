// Lyrics studio — admin-only client fetchers for the maintenance workflow.
// Kept in lib/api (never inline fetch in components). These hit the backend's
// lyrics write surface, which is guarded by LYRICS_PASSWORD (separate from the
// site gate): GET /lyrics/status is open, POST/PATCH require the password in
// the body and answer 401 when it's wrong. NEXT_PUBLIC_API_URL is inlined at
// build time (client-safe), same as the rest of lib/api.

import { type LyricLine, toWire } from "@/lib/api/lyrics";

const API = process.env.NEXT_PUBLIC_API_URL;

/** Maintenance states (backend migrations/0005). 'none' = a NULL column: no
 *  lyrics on file. The player only ever sees timed/untimed content; the rest is
 *  admin metadata. */
export type LyricsState =
  | "none"
  | "untimed"
  | "auto"
  | "verified"
  | "instrumental";

export const LYRICS_STATES: LyricsState[] = [
  "none",
  "untimed",
  "auto",
  "verified",
  "instrumental",
];

/** One row of the whole-catalogue work queue (GET /lyrics/status). `name` keeps
 *  its raw "NN - " track-number prefix — useful for locating a song on its disc. */
export type StatusSong = {
  id: string;
  name: string;
  album: string | null;
  state: LyricsState;
};

/** Thrown by saveLyrics/patchLyricsState on a 401 so the UI can single out a
 *  wrong password from a generic failure. */
export class WrongPasswordError extends Error {
  constructor() {
    super("Wrong lyrics password");
    this.name = "WrongPasswordError";
  }
}

/** Every song's maintenance state, in one call. */
export async function fetchLyricsStatus(): Promise<StatusSong[]> {
  const res = await fetch(`${API}/lyrics/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lyrics status: ${res.status}`);
  const data = (await res.json()) as { songs: StatusSong[] };
  return data.songs;
}

/** Write lyric content + workflow state. Returns the state the backend settled
 *  on. Throws WrongPasswordError on 401. */
export async function saveLyrics(
  songId: string,
  lines: LyricLine[],
  state: LyricsState,
  password: string,
): Promise<{ state: LyricsState }> {
  const res = await fetch(`${API}/lyrics/${songId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, state, lyrics: lines.map(toWire) }),
  });
  if (res.status === 401) throw new WrongPasswordError();
  if (!res.ok) throw new Error(`Failed to save lyrics: ${res.status}`);
  const data = (await res.json()) as { state: LyricsState };
  return data;
}
