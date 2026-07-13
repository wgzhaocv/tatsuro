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
import { useQueuePlayback } from "./playback-context";
import { TrackActions } from "./track-actions";

/**
 * One track: number · title · time · actions. A soft rounded hover wash instead
 * of table rules keeps the sheet airy. The number+title area is the play
 * control (whole-row-is-a-button, but the like/add/remove cluster sits beside
 * it as sibling buttons — never nested). On hover/focus the number gives way to
 * a play glyph; clicking starts this queue at the track (or toggles it while
 * current). The current track keeps its glyph and turns deep-water. Used by
 * both album discs and playlist detail (via QueuePlaybackProvider).
 */
export function TrackRow({
  track,
  index,
  queueIndex,
  onRemove,
}: {
  track: Song;
  index: number;
  /** Position in the queue (across discs / the whole playlist). */
  queueIndex: number;
  /** When set, the row shows a remove button (playlist detail). */
  onRemove?: (song: Song) => void;
}) {
  const t = useTranslations("album");
  const { songs, label, queueId } = useQueuePlayback();
  // The enriched queue song (cover + album baked in) backs the actions, so a
  // playlist entry it creates renders without a refetch; fall back to `track`.
  const song = songs[queueIndex] ?? track;
  const isCurrent = usePlayerStore((s) => s.current?.id === track.id);
  // Fold the play flag into the selector so non-current rows resolve to a
  // stable `false` and skip re-rendering on every play/pause toggle.
  const isPlaying = usePlayerStore(
    (s) => s.isPlaying && s.current?.id === track.id,
  );
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  // Arriving on a screen that holds the playing song lands you on its row.
  const rowRef = useRef<HTMLLIElement>(null);
  useScrollToCurrentOnEnter(rowRef, isCurrent);

  const number = track.trackNumber ?? index + 1;

  return (
    <li ref={rowRef}>
      <div className="group flex min-h-11 items-center gap-2 rounded-xl pr-1 pl-3 transition-colors duration-300 ease-lazy hover:bg-navy/[0.05] dark:hover:bg-white/[0.06]">
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
            else playQueue(songs, queueIndex, label, queueId);
          }}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-xl py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="relative grid h-5 w-6 shrink-0 place-items-center">
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
        </button>
        <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
          {typeof track.duration === "number"
            ? formatDuration(track.duration)
            : "—"}
        </span>
        <TrackActions
          song={song}
          onRemove={onRemove ? () => onRemove(song) : undefined}
        />
      </div>
    </li>
  );
}
