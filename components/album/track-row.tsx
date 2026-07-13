"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { Song } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { usePlayerStore } from "@/lib/player/store";
import { useScrollToCurrentOnEnter } from "@/lib/player/use-scroll-to-current";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import { useEditionPlayback } from "./edition-playback";

/**
 * One track: number · title · time. A soft rounded hover wash instead of
 * table rules keeps the sheet airy. The whole row is the play control: on
 * hover/focus the number gives way to a play glyph; clicking starts the
 * edition's queue at this track (or toggles it while it's the current one).
 * The current track keeps its glyph and turns deep-water. min-h keeps the
 * touch target ≥44px.
 */
export function TrackRow({
  track,
  index,
  queueIndex,
}: {
  track: Song;
  index: number;
  /** Position in the edition-wide queue (across discs). */
  queueIndex: number;
}) {
  const t = useTranslations("album");
  const { songs, label } = useEditionPlayback();
  const isCurrent = usePlayerStore((s) => s.current?.id === track.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying) && isCurrent;
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  // Arriving on an album that holds the playing song lands you on its row.
  const rowRef = useRef<HTMLLIElement>(null);
  useScrollToCurrentOnEnter(rowRef, isCurrent);

  const number = track.trackNumber ?? index + 1;

  return (
    <li ref={rowRef}>
      <button
        type="button"
        aria-label={
          isPlaying
            ? t("pauseNamed", { name: track.name })
            : t("playNamed", { name: track.name })
        }
        aria-current={isCurrent ? "true" : undefined}
        onClick={() => {
          if (isCurrent) toggle();
          else playQueue(songs, queueIndex, label);
        }}
        className="group grid min-h-11 w-full grid-cols-[1.5rem_1fr_auto] items-center gap-4 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-300 ease-lazy hover:bg-navy/[0.05] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/[0.06]"
      >
        <span className="relative grid h-5 w-6 place-items-center justify-self-end">
          <span
            className={cn(
              "text-[13px] text-muted-foreground tabular-nums transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0",
              isCurrent && "opacity-0",
            )}
          >
            {number}
          </span>
          {isPlaying ? (
            <Pause
              aria-hidden
              size={15}
              weight="fill"
              className="absolute text-primary"
            />
          ) : (
            <Play
              aria-hidden
              size={15}
              weight="fill"
              className={cn(
                "absolute transition-opacity duration-300",
                isCurrent
                  ? "text-primary opacity-100"
                  : "text-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              )}
            />
          )}
        </span>
        <span
          lang={isJapanese(track.name) ? "ja" : undefined}
          title={track.name}
          className={cn(
            "truncate text-[15px]",
            isCurrent ? "font-medium text-primary" : "text-foreground",
          )}
        >
          {track.name}
        </span>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {typeof track.duration === "number"
            ? formatDuration(track.duration)
            : "—"}
        </span>
      </button>
    </li>
  );
}
