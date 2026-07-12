"use client";

import {
  MusicNotes,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { coverUrl } from "@/lib/api/urls";
import {
  useDuration,
  usePlayerStore,
  useProgressStore,
} from "@/lib/player/store";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * The persistent bar at the bottom of every (main) screen. Always an opaque
 * solid surface — white in noon, twilight navy in dusk (Glass Discipline's
 * explicit exemption) — with a hairline of played-progress hugging its top
 * edge. Tapping the song identity opens the full player; transport buttons
 * stay directly reachable.
 */
export function MiniPlayer() {
  const song = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const contextLabel = usePlayerStore((s) => s.contextLabel);

  const subline = song?.albumName ?? contextLabel ?? "";

  return (
    <section
      aria-label="Player"
      // Off-screen (no queue) means gone: unfocusable and invisible to AT.
      inert={!song}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card text-card-foreground transition-transform duration-500 ease-lazy",
        song ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <MiniProgress />
      <div className="mx-auto flex h-[4.75rem] max-w-6xl items-center gap-3 px-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={song ? `Open player — ${song.name}` : "Open player"}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pr-2 text-left outline-none transition-colors duration-300 ease-lazy hover:bg-navy/[0.04] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/[0.05]"
        >
          <span className="relative block size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous track"
            onClick={() => prev()}
            className="hidden text-foreground sm:inline-flex"
          >
            <SkipBack size={20} weight="fill" aria-hidden />
          </Button>
          <Button
            variant="action"
            size="icon-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
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
            aria-label="Next track"
            onClick={() => next()}
            className="text-foreground"
          >
            <SkipForward size={20} weight="fill" aria-hidden />
          </Button>
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

  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 h-[3px] -translate-y-px"
    >
      <div
        className="h-full bg-[image:var(--gradient-action)] transition-[width] duration-300 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
