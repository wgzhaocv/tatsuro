import {
  type ApiSongInfo,
  type NameLang,
  type Song,
  toSongFromInfo,
} from "./types";

// Shared-playlist read — the public GET /share/:slug (yamashita-api API.md §9).
//
// No 'use cache', unlike the cached get* readers in this directory (fetch* here
// means uncached — cf. fetchLyrics, fetchLyricsStatus): a share is live (the owner
// keeps editing it) and revocable (the link must die the moment it's revoked), and
// the Workers cache in front of it can't be purged — only a redeploy refreshes it.
// So the whole path is no-store: the Worker sends it, this fetch asks for it.
// Don't "optimize" this into a cached read.

const API = process.env.NEXT_PUBLIC_API_URL;

// `kind` is spelled out rather than imported as lib/playlists/types PlaylistKind
// on purpose: that module imports from lib/api/types, so importing it back here
// would invert the layer dependency.

/** A playlist someone shared, as the viewer page renders it. */
export type SharedPlaylist = {
  /** "liked" is titled from share.likedSongsTitle (owner-attributed), not `name`. */
  kind: "liked" | "user";
  name: string;
  coverId?: string;
  /** The owner's Google display name — null when they have none on file. */
  ownerName: string | null;
  songs: Song[];
};

type WireSharedPlaylist = {
  playlist: {
    kind: "liked" | "user";
    name: string;
    coverId?: string | null;
  };
  owner: { name: string | null };
  songs: ApiSongInfo[];
};

/**
 * Fetch a shared playlist by slug. Null for every unreadable case — unknown slug,
 * revoked share, a playlist its owner has since deleted, or a network/parse
 * failure — instead of throwing like the cached readers in this directory.
 */
export async function fetchSharedPlaylist(
  slug: string,
  lang: NameLang,
): Promise<SharedPlaylist | null> {
  try {
    const res = await fetch(
      `${API}/share/${encodeURIComponent(slug)}?lang=${lang}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as WireSharedPlaylist;
    return {
      kind: data.playlist.kind,
      name: data.playlist.name,
      coverId: data.playlist.coverId ?? undefined,
      ownerName: data.owner.name ?? null,
      // Full /music/:id shape on the wire, so the rows land complete (cover,
      // album, duration) and never trigger the thin-row backfill fan-out in
      // components/playlists/hydration.
      songs: data.songs.map(toSongFromInfo),
    };
  } catch {
    return null;
  }
}
