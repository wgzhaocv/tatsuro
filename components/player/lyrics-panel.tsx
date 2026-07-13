"use client";

import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef } from "react";
import { currentLineIndex, isTimed, type LyricLine } from "@/lib/api/lyrics";
import { usePlayerStore, useProgressStore } from "@/lib/player/store";
import { useLyrics } from "@/lib/queries/lyrics";
import { isJapanese } from "@/lib/text";
import { cn, prefersReducedMotion } from "@/lib/utils";

/**
 * Lyrics inside the full player, floating directly on the cover-ambient wash
 * (ink on light — no extra sheet). Timed lyrics follow playback: the current
 * line turns sunset coral (Coral Ink in noon, shallow coral on dusk — the One
 * Sunset Rule's accent), clicking a line seeks there, and the list drifts to
 * keep the line centered — pausing for 3s whenever the listener scrolls
 * themselves. Untimed lyrics render as still text; no lyrics stays quiet.
 */
export function LyricsPanel({
  songId,
  className,
}: {
  songId: string;
  className?: string;
}) {
  const { data: lines, isLoading, isError } = useLyrics(songId);
  const t = useTranslations("lyrics");

  if (isLoading) {
    return (
      <output
        className={cn("flex flex-col justify-center gap-4 px-8", className)}
      >
        <span className="sr-only">{t("loading")}</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded-full bg-foreground/10"
            style={{ width: `${72 - i * 14}%` }}
          />
        ))}
      </output>
    );
  }

  if (isError || !lines || lines.length === 0) {
    return (
      <div className={cn("grid place-items-center px-8", className)}>
        <p className="text-[15px] text-muted-foreground">{t("none")}</p>
      </div>
    );
  }

  return isTimed(lines) ? (
    <SyncedLyrics key={songId} lines={lines} className={className} />
  ) : (
    <div
      className={cn(
        // no-scrollbar: the fade mask would clip a native scrollbar mid-track
        "no-scrollbar overflow-y-auto py-6 [mask-image:linear-gradient(to_bottom,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)]",
        className,
      )}
    >
      <ul className="space-y-4 px-6">
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list, lines have no ids
          <li key={i}>
            <LineText line={line} state="plain" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyncedLyrics({
  lines,
  className,
}: {
  lines: LyricLine[];
  className?: string;
}) {
  // Selector returns the *index*, so the ~4Hz timeupdate ticks only
  // re-render this list at line boundaries, not on every tick.
  const current = useProgressStore((s) =>
    currentLineIndex(lines, s.currentTime),
  );
  const currentRef = useRef(current);
  currentRef.current = current;

  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const firstCenter = useRef(true);

  // Scroll the list only (scrollIntoView could also drag the dialog page).
  const centerOnCurrent = useCallback((behavior: ScrollBehavior) => {
    const list = listRef.current;
    const row = rowRefs.current[currentRef.current];
    if (!list || !row) return;
    list.scrollTo({
      top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2,
      behavior: prefersReducedMotion() ? "auto" : behavior,
    });
  }, []);

  // The listener's own scrolling wins over follow-along for 3 seconds; once
  // they let go, drift back to the current line instead of waiting for the
  // next line change (which can be a whole instrumental away).
  const userScrollUntil = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markUserScroll = () => {
    userScrollUntil.current = Date.now() + 3000;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (usePlayerStore.getState().isPlaying && currentRef.current >= 0) {
        centerOnCurrent("smooth");
      }
    }, 3200);
  };
  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (current < 0) return;
    if (Date.now() < userScrollUntil.current) return;
    // The first centering jumps into place — a long smooth swoosh from the
    // top of the list on open reads as noise, not orientation.
    centerOnCurrent(firstCenter.current ? "auto" : "smooth");
    firstCenter.current = false;
  }, [current, centerOnCurrent]);

  return (
    <ol
      ref={listRef}
      onWheel={markUserScroll}
      onTouchMove={markUserScroll}
      className={cn(
        // relative so row offsetTop is measured within this list (scroll math);
        // no-scrollbar because the fade mask would clip a native scrollbar.
        // Modest fixed padding: enough for near-edge lines to sit away from
        // the fade, small enough that flex can shrink the list when space is
        // tight (percentage padding can't compress).
        "no-scrollbar relative overflow-y-auto py-14 [mask-image:linear-gradient(to_bottom,transparent,black_3rem,black_calc(100%-3rem),transparent)] sm:py-16",
        className,
      )}
    >
      {lines.map((line, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: static list, lines have no ids
          key={i}
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
        >
          <LyricRow
            line={line}
            state={i === current ? "current" : i < current ? "passed" : "plain"}
          />
        </li>
      ))}
    </ol>
  );
}

type LineState = "current" | "passed" | "plain";

/** One clickable timed line: click = sing from here. Memoized so a line
 *  boundary only re-renders the two rows whose state actually changed. */
const LyricRow = memo(function LyricRow({
  line,
  state,
}: {
  line: LyricLine;
  state: LineState;
}) {
  const seek = usePlayerStore((s) => s.seek);
  const play = usePlayerStore((s) => s.play);

  return (
    <button
      type="button"
      onClick={() => {
        seek(line.startTime);
        play();
      }}
      aria-current={state === "current" ? "true" : undefined}
      className="block w-full rounded-xl px-5 py-2.5 text-left transition-colors duration-400 ease-lazy hover:bg-navy/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/[0.06]"
    >
      <LineText line={line} state={state} />
    </button>
  );
});

function LineText({ line, state }: { line: LyricLine; state: LineState }) {
  return (
    <>
      <p
        lang={isJapanese(line.origin) ? "ja" : undefined}
        className={cn(
          "text-[17px] leading-relaxed transition-colors duration-400 ease-lazy",
          state === "current" && "font-medium text-coral-ink dark:text-coral",
          state === "passed" && "text-muted-foreground/80",
          state === "plain" && "text-foreground/80",
        )}
      >
        {line.origin}
      </p>
      {line.ja && (
        <p lang="ja" className="mt-1 text-[13px] text-muted-foreground">
          {line.ja}
        </p>
      )}
      {line.en && (
        <p className="mt-0.5 text-[13px] text-muted-foreground">{line.en}</p>
      )}
    </>
  );
}
