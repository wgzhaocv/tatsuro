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

/** Summed seconds → a human total: "58 min", "1 hr 12 min", "2 hr". */
export function formatTotalDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
