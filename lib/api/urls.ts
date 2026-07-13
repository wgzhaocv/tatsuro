// Direct-URL endpoints — streaming audio, cover art, MV assets. These aren't JSON
// fetches, just URLs the browser hits directly (<img>, <audio>, download links), so
// they're pure builders with no caching. Client-safe: NEXT_PUBLIC_API_URL is inlined
// at build time. The image hosts here must stay in sync with next.config.ts
// remotePatterns.

const API = process.env.NEXT_PUBLIC_API_URL;

/** Cover art image. `coverId` is Album.coverFrontId / coverBackId. */
export function coverUrl(coverId: string): string {
  return `${API}/stream/img/${coverId}`;
}

/** Playable audio stream (supports HTTP Range). */
export function songStreamUrl(songId: string): string {
  return `${API}/stream/new_play/${songId}`;
}

/** Downloadable audio file. */
export function songDownloadUrl(songId: string): string {
  return `${API}/stream/download/${songId}`;
}

/** Downloadable MV video file. Streaming + thumbnails come pre-built from
 *  /mv/list (public bucket domain); only the attachment download stays a
 *  Worker route (for the Content-Disposition filename). */
export function mvDownloadUrl(mvId: string): string {
  return `${API}/mv/download/${mvId}`;
}
