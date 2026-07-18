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

/** The next/image optimizer variant of a remote image — the URL the on-screen
 *  <Image> actually requests, so fetching it usually hits the HTTP cache (and
 *  the SW cover cache, so it works offline) instead of pulling the ~1MB
 *  original. `width` must be one of next.config's imageSizes/deviceSizes and
 *  75 is the only configured quality, or /_next/image rejects the request. */
export function nextImageUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/** Playable audio stream (supports HTTP Range). */
export function songStreamUrl(songId: string): string {
  return `${API}/stream/new_play/${songId}`;
}

/** Inverse of songStreamUrl: the song id out of a cached stream URL, or null if
 *  it isn't one. Lives beside its builder so the /stream/new_play contract has a
 *  single home — the offline cache reads song ids back out of bucket keys. */
export function songIdFromStreamUrl(url: string): string | null {
  return url.match(/\/stream\/new_play\/([^/?#]+)/)?.[1] ?? null;
}

/** Downloadable audio file. */
export function songDownloadUrl(songId: string): string {
  return `${API}/stream/download/${songId}`;
}

/** Downloadable full-edition zip (all discs' AAC-192k m4a + covers). `editionId`
 *  is EditionDownload.editionId. The Worker sets Content-Disposition, so the
 *  browser saves it — hand it straight to an <a href>/window.location. */
export function editionZipUrl(editionId: string): string {
  return `${API}/music/edition_zip/${editionId}`;
}

/** Downloadable MV video file. Streaming + thumbnails come pre-built from
 *  /mv/list (public bucket domain); only the attachment download stays a
 *  Worker route (for the Content-Disposition filename). */
export function mvDownloadUrl(mvId: string): string {
  return `${API}/mv/download/${mvId}`;
}
