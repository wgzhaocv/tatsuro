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

function totalDurationParts(seconds: number): {
  hours: number;
  minutes: number;
} {
  const totalMinutes = Math.round(seconds / 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** Localized total-duration label ("58 min" / "1 hr 12 min" / "2 hr"), or null
 *  when there's nothing to show. Numbers split here; the words come from i18n
 *  (units.min / units.hrMin / units.hr) via the passed translator, so this stays
 *  the single place the phrase tiers live. */
export function durationLabel(
  t: (key: string, values?: Record<string, number>) => string,
  seconds: number,
): string | null {
  if (seconds <= 0) return null;
  const { hours, minutes } = totalDurationParts(seconds);
  if (hours === 0) return t("units.min", { n: minutes });
  return minutes
    ? t("units.hrMin", { h: hours, m: minutes })
    : t("units.hr", { n: hours });
}
