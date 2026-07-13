"use client";

// One-time import of the OLD site's playlists. Same origin → the browser keeps
// the old localStorage blob across the deploy, but the new store uses a new key
// and shape, so the data must be actively read and mapped (not automatic). Runs
// once, only when the new key is absent (see components/playlists/hydration).
//
// Old shape (zustand persist wrapper): {
//   state: { playlists: [{ id, name, coverUrlId, songs: [{songId, songName}], createdAt }] }
// }
// Old ids: "liked" (reserved) or a 7-char random string; "bestCollection" was a
// server-curated list that never belonged in the store — dropped here.

import type { Playlist } from "./types";
import { LIKED_ID } from "./types";

const LEGACY_KEY = "music-playlist-storage";

type LegacySong = { songId: string; songName: string };
type LegacyPlaylist = {
  id: string;
  name: string;
  coverUrlId?: string;
  songs: LegacySong[];
  createdAt: number;
};

/** Match the app's track-name convention: strip a leading "01 - " so imported
 *  names line up with freshly-fetched ones. */
function cleanName(raw: string): string {
  return raw.replace(/^\s*\d+\s*-\s*/, "").trim();
}

/**
 * Read + map the legacy playlists, or null when there's nothing to import or
 * the blob is unreadable. Entries carry only a *thin* Song (id + name) — the
 * old store never stored covers/durations — so migrated rows list with a
 * placeholder cover and a "—" duration until edited. Playback is unaffected:
 * the id resolves to audio and the full player fills in cover/album via
 * useSong. Never throws.
 */
export function migrateLegacyPlaylists(): Playlist[] | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { state?: { playlists?: unknown } };
    const legacy = parsed?.state?.playlists;
    if (!Array.isArray(legacy)) return null;

    const out: Playlist[] = [];
    for (const p of legacy as LegacyPlaylist[]) {
      if (!p || typeof p.id !== "string") continue;
      if (p.id === "bestCollection") continue; // server-curated, not user data
      const createdAt =
        typeof p.createdAt === "number" ? p.createdAt : Date.now();
      const isLiked = p.id === LIKED_ID;
      out.push({
        id: p.id,
        kind: isLiked ? "liked" : "user",
        name: isLiked ? "Liked Songs" : (p.name ?? "Playlist"),
        // Only a real cover id maps over; "liked"/"default" become derived covers.
        coverId:
          p.coverUrlId && p.coverUrlId !== "liked" && p.coverUrlId !== "default"
            ? p.coverUrlId
            : undefined,
        entries: (Array.isArray(p.songs) ? p.songs : [])
          .filter((s) => s && typeof s.songId === "string")
          .map((s) => ({
            song: { id: s.songId, name: cleanName(s.songName ?? "") },
            addedAt: createdAt,
          })),
        createdAt,
        updatedAt: createdAt,
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}
