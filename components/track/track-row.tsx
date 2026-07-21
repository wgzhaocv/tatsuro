"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { memo, useRef } from "react";
import type { Song } from "@/lib/api/types";
import { usePlayerStore } from "@/lib/player/store";
import { useScrollToCurrentOnEnter } from "@/lib/player/use-scroll-to-current";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import { CacheDot } from "./cache-dot";
import { useIsThisQueue, useQueuePlayback } from "./playback-context";
import { TrackActions } from "./track-actions";

/**
 * One track: number · title · time · actions. A soft rounded hover wash instead
 * of table rules keeps the sheet airy. The number+title area is the play
 * control (whole-row-is-a-button, but the like/add/remove cluster sits beside
 * it as sibling buttons — never nested). On hover/focus the number gives way to
 * a play glyph; clicking starts this queue at the track (or toggles it while
 * current). The current track keeps its glyph and turns deep-water. Used by
 * both album discs and playlist detail (via QueuePlaybackProvider).
 *
 * memo'd: long lists re-render their rows only when a row's own props or the
 * queue context actually change — not because the parent list re-rendered
 * (playlist detail re-runs on every store edit; keep onRemove referentially
 * stable there or the memo is defeated).
 */
export const TrackRow = memo(function TrackRow({
  index,
  queueIndex,
  track,
  onRemove,
  hideLike,
  showAlbumLink,
}: {
  index: number;
  /** Position in the queue (across discs / the whole playlist). */
  queueIndex: number;
  /** The row's Song, when the caller already holds it client-side (playlist
   *  detail — same objects as the provider's, so it's free). Server screens
   *  (album discs) omit it and the row reads the provider's queue entry:
   *  passing it there would serialize every track into the RSC payload twice
   *  (once per row, once in the provider) — 20-40KB extra on big live sets. */
  track?: Song;
  /** When set, the row shows a remove button (playlist detail). Receives the
   *  row's index too, so the callback needn't close over the list (a stable
   *  identity is what lets the memo above actually skip work). */
  onRemove?: (song: Song, index: number) => void;
  /** Drop the like heart (the Liked list, where it duplicates remove). */
  hideLike?: boolean;
  /** Offer "view album" in the overflow menu (playlist / Liked rows). */
  showAlbumLink?: boolean;
}) {
  const t = useTranslations("album");
  const { songs, label, queueId, href } = useQueuePlayback();
  // The queue song is enriched (cover + album baked in), so the actions render
  // without a refetch.
  const song = track ?? songs[queueIndex];
  const songId = song?.id;
  // "Current" means this song *in this queue*, not just this song id: the same
  // track can sit in many lists, and playing it from album A must not light up
  // (or pause) its row in playlist B. Clicking that row should switch the queue
  // to B and restart from here — so the queue-scoped flag is what drives both
  // the glyph and the click below. Song-id selectors stay folded (non-current
  // rows resolve to a stable `false` and skip play/pause re-renders); we AND in
  // the queue check, which is itself a stable per-queue selector.
  const isThisQueue = useIsThisQueue(queueId);
  const isCurrent =
    usePlayerStore((s) => s.current?.id === songId) && isThisQueue;
  const isPlaying =
    usePlayerStore((s) => s.isPlaying && s.current?.id === songId) &&
    isThisQueue;
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  // Arriving on a screen that holds the playing song lands you on its row.
  const rowRef = useRef<HTMLLIElement>(null);
  useScrollToCurrentOnEnter(rowRef, isCurrent);

  // Can't happen when the provider is fed correctly (queueIndex indexes the
  // provider's own flatten) — guard so a mismatch degrades to a missing row
  // rather than a crash. After the hooks, which must run unconditionally.
  if (!song) return null;

  const number = song.trackNumber ?? index + 1;

  return (
    <li ref={rowRef}>
      {/* data-song-id lets a shared-song link (?song=) find + flash this row. */}
      <div
        data-song-id={song.id}
        className="group flex min-h-11 items-center gap-2 rounded-xl pr-1 pl-3 ring-primary/50 ring-inset transition-colors duration-500 ease-lazy hover:bg-navy/[0.05] data-[shared=true]:bg-primary/10 data-[shared=true]:ring-1 dark:hover:bg-white/[0.06]"
      >
        <button
          type="button"
          aria-label={
            isPlaying
              ? t("pauseNamed", { name: song.name })
              : t("playNamed", { name: song.name })
          }
          aria-current={isCurrent ? "true" : undefined}
          onClick={() => {
            if (isCurrent) toggle();
            else playQueue(songs, queueIndex, label, queueId, href);
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
            lang={isJapanese(song.name) ? "ja" : undefined}
            title={song.name}
            className={cn(
              "truncate text-[15px]",
              isCurrent ? "font-medium text-primary" : "text-foreground",
            )}
          >
            {song.name}
          </span>
        </button>
        <CacheDot songId={song.id} />
        <TrackActions
          song={song}
          onRemove={onRemove ? () => onRemove(song, index) : undefined}
          hideLike={hideLike}
          showAlbumLink={showAlbumLink}
        />
      </div>
    </li>
  );
});
