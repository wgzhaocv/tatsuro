import { getTranslations } from "next-intl/server";
import type { Disc } from "@/lib/api/types";
import { durationLabel } from "@/lib/format";
import { isJapanese } from "@/lib/text";
import { TrackRow } from "./track-row";

/**
 * One disc's tracks inside the sheet. Multi-disc sets get a heading — the
 * disc title (or "Disc N"), a Live tag for live recordings, and a "Disc N ·
 * 12 songs · 48 min" sub-line over a hairline. Single-disc editions skip the
 * chrome and just list tracks.
 */
export async function DiscSection({
  disc,
  showHeading,
  startIndex,
  locale,
}: {
  disc: Disc;
  showHeading: boolean;
  /** This disc's offset in the edition-wide queue (across discs). */
  startIndex: number;
  locale: string;
}) {
  const t = await getTranslations({ locale });
  const seconds = disc.tracks.reduce((acc, tr) => acc + (tr.duration ?? 0), 0);
  // Untitled discs use "Disc N" as their heading — don't repeat it below.
  const subLine = [
    disc.title ? t("album.disc", { n: disc.number }) : null,
    t("album.songCount", { n: disc.tracks.length }),
    durationLabel(t, seconds),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="pt-8 first:pt-0">
      {showHeading && (
        <>
          <header className="mb-2 px-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  lang={disc.title && isJapanese(disc.title) ? "ja" : undefined}
                  className="truncate font-display text-[1.0625rem] leading-tight font-medium text-foreground"
                >
                  {disc.title || t("album.disc", { n: disc.number })}
                </h2>
                {disc.recording === "live" && (
                  <span className="shrink-0 rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-medium text-coral-ink dark:bg-coral/25 dark:text-coral">
                    {t("album.live")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {subLine}
              </p>
            </div>
          </header>
          <hr className="mb-1 border-border/70" />
        </>
      )}
      <ol>
        {disc.tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            queueIndex={startIndex + i}
          />
        ))}
      </ol>
    </section>
  );
}
