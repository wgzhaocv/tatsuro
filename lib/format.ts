// Formatting helpers for track/album durations. The API returns seconds as a
// float (e.g. 349.033); tracklists want m:ss and album totals want a rounded
// "58 min" / "1 hr 12 min".

/** Seconds → "m:ss" for a single track. */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/** Bytes → "84.5 MB" / "1.2 GB" for download sizes. */
export function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 ** 2;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

/** An MV's two weights, labelled: "Watch 70.7 MB · Download 118 MB".
 *  Watching (webm) and downloading (mp4) are different files with different
 *  sizes — plain verbs so the numbers mean something, no codec talk. */
export function formatMvSizes(streamSize: number, fileSize: number): string {
  return `Watch ${formatFileSize(streamSize)} · Download ${formatFileSize(fileSize)}`;
}

/** Summed seconds → a human total: "58 min", "1 hr 12 min", "2 hr". */
export function formatTotalDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
