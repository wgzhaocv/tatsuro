"use client";

import {
  MusicNotes,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LikeButton } from "@/components/playlists/like-button";
import { Button } from "@/components/ui/button";
import { coverUrl } from "@/lib/api/urls";
import {
  useDuration,
  usePlayerStore,
  useProgressStore,
} from "@/lib/player/store";
import { useDominantColor } from "@/lib/player/use-dominant-color";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * The persistent player at the bottom of every (main) screen — a floating
 * bar, detached from the edges, sharing the frosted-glass material of the top
 * nav and the content sheets (GlassPanel: white glass in noon, twilight navy
 * in dusk), carried on a tinted downward shadow, with a hairline of
 * played-progress hugging its top edge. Tapping the song identity opens the
 * full player; transport buttons stay directly reachable.
 */
export function MiniPlayer() {
  const song = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const contextLabel = usePlayerStore((s) => s.contextLabel);
  const t = useTranslations("player");

  const subline = song?.albumName ?? contextLabel ?? "";
  // The bar wears a faint cast of the current cover — the same colour trick
  // the old site pulled from artwork, here kept to a whisper over the glass.
  const tint = useDominantColor(
    song?.coverFrontId ? coverUrl(song.coverFrontId) : null,
  );

  return (
    <section
      aria-label={t("player")}
      // Off-screen (no queue) means gone: unfocusable and invisible to AT.
      inert={!song}
      className={cn(
        // Below lg the BottomNav owns the bottom edge, so float above it
        // (+3.5rem bar + a gap); at lg the tab bar is gone and the bar sits low.
        // The wrapper never catches pointer events — its transparent padding
        // overlaps the BottomNav below it (z-40 over z-30), and would otherwise
        // eat the tab bar's clicks. Only the bar itself is interactive.
        // transform-gpu + backface-hidden keep the bar on its own compositing
        // layer, glued to the viewport through the iOS URL-bar show/hide rather
        // than detaching from a stale layout-viewport bottom (composes with the
        // translate-y show/hide below).
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 transform-gpu px-3 pb-[calc(env(safe-area-inset-bottom)+3.5rem+0.5rem)] transition-transform duration-500 ease-lazy [-webkit-backface-visibility:hidden] [backface-visibility:hidden] sm:px-4 lg:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        song ? "translate-y-0" : "translate-y-[130%]",
      )}
    >
      {/* The floating bar proper: the same frosted glass as the nav / content
          sheets, but a heavier fill (less see-through) since it carries live
          controls. Rounded, lifted on a navy shadow; overflow-hidden lets the
          progress line ride the rounded top edge. pointer-events-auto re-arms
          the bar (the wrapper opts out above). */}
      <div className="pointer-events-auto relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/55 bg-white/30 text-foreground shadow-float-navy backdrop-blur-xl backdrop-saturate-150 dark:border-white/15 dark:bg-dusk-navy/34">
        {/* Cover-cast: the old site's trick — the cover's colour IS the bar,
            half-lit and see-through. The neutral glass is pulled thin (just a
            light/dark base tone so ink text keeps its contrast whatever the
            cover is — Deep-Water Rule), and the cover colour rides strong on
            top: a real cast, not a whisper. The colour is pre-refined
            (saturation floored, lightness mid-banded) so it stays clean rather
            than muddy at this strength, heavier in dusk where it glows on the
            dark base. Under the progress line + content (both stack above);
            crossfades on song change; transparent (glass left clean) while it
            resolves / for an all-neutral cover. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.34] transition-colors duration-700 ease-lazy dark:opacity-[0.48]"
          style={{ backgroundColor: tint ?? "transparent" }}
        />
        <MiniProgress />
        {/* Height chosen so the 44px cover/controls get the same ~10px inset
            top, bottom, and left — a uniform frame gap. */}
        <div className="relative flex h-16 items-center gap-3 px-2.5">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={song ? t("openNamed", { name: song.name }) : t("open")}
            // -ml compensates pl so the cover keeps its alignment while the
            // hover wash gets equal breathing room on all sides.
            className="group -ml-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pr-2 pl-1.5 text-left outline-none transition-colors duration-300 ease-lazy hover:bg-navy/[0.04] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/[0.05]"
          >
            {/* The cover turns like a record while playing; pausing freezes it
              in place via animation-play-state (no snap back to 0°). Round so
              the turn reads as a disc rather than a tumbling square. */}
            <span
              className={cn(
                "relative block size-11 shrink-0 animate-spin-slow overflow-hidden rounded-full bg-secondary",
                isPlaying
                  ? "[animation-play-state:running]"
                  : "[animation-play-state:paused]",
              )}
            >
              {song?.coverFrontId ? (
                <Image
                  src={coverUrl(song.coverFrontId)}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <MusicNotes
                  aria-hidden
                  size={20}
                  className="absolute inset-0 m-auto text-muted-foreground"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                lang={song && isJapanese(song.name) ? "ja" : undefined}
                className="truncate text-[15px] leading-snug text-foreground"
              >
                {song?.name}
              </span>
              {subline && (
                <span
                  lang={isJapanese(subline) ? "ja" : undefined}
                  className="truncate text-[12.5px] leading-snug text-muted-foreground"
                >
                  {subline}
                </span>
              )}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {song && (
              <LikeButton song={song} className="hidden sm:inline-flex" />
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("previous")}
              onClick={() => prev()}
              className="hidden text-foreground sm:inline-flex"
            >
              <SkipBack size={20} weight="fill" aria-hidden />
            </Button>
            <Button
              variant="action"
              size="icon-lg"
              aria-label={isPlaying ? t("pause") : t("play")}
              onClick={() => toggle()}
              className="size-11 rounded-full shadow-lift-ocean"
            >
              {isPlaying ? (
                <Pause size={20} weight="fill" aria-hidden />
              ) : (
                <Play size={20} weight="fill" aria-hidden />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("next")}
              onClick={() => next()}
              className="text-foreground"
            >
              <SkipForward size={20} weight="fill" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The 3px played-progress line hugging the bar's top edge (display only). */
function MiniProgress() {
  const currentTime = useProgressStore((s) => s.currentTime);
  const duration = useDuration();
  const percent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Hug the very top edge, but inset horizontally past the card's rounded
  // corners (radius ~36px) so the line never rides into the curve — the played
  // fill starts cleanly at the left of the straight edge, with a rounded cap.
  return (
    <div aria-hidden className="absolute inset-x-10 top-0 z-10 h-[3px]">
      <div
        className="h-full rounded-full bg-[image:var(--gradient-action)] transition-[width] duration-300 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
