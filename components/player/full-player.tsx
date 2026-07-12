"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  CaretDown,
  MicrophoneStage,
  Pause,
  Play,
  Repeat,
  RepeatOnce,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { AlbumAmbient } from "@/components/album/album-ambient";
import { FadeImage } from "@/components/album/fade-image";
import { Button } from "@/components/ui/button";
import { coverUrl } from "@/lib/api/urls";
import { ARTIST } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import {
  useDuration,
  usePlayerStore,
  useProgressStore,
} from "@/lib/player/store";
import { useSong } from "@/lib/queries/song";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import { LyricsPanel } from "./lyrics-panel";
import { Scrubber } from "./scrubber";
import { Spectrum } from "./spectrum";

/**
 * The full-screen player the mini bar expands into. Same material story as
 * the album screen: the current cover, blurred huge, washes the whole view
 * and dissolves into noon light (dusk navy in dark), so every song colours
 * the room it plays in — ink text throughout, no heavy scrim. Built on the
 * dialog primitive for focus handling and Escape.
 */
export function FullPlayer() {
  const expanded = usePlayerStore((s) => s.expanded);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const song = usePlayerStore((s) => s.current);
  const contextLabel = usePlayerStore((s) => s.contextLabel);
  // Cover ⇄ lyrics flip; kept while the player stays open so a listener can
  // follow along across an album.
  const [showLyrics, setShowLyrics] = useState(false);

  // Queue entries carry cover/album from the release payload; for anything
  // missing (restored sessions, direct plays) the song query fills the gaps.
  const { data: details } = useSong(expanded ? song?.id : undefined);
  const cover = song?.coverFrontId ?? details?.coverFrontId;
  const albumName = song?.albumName ?? details?.albumName;

  if (!song) return null;

  return (
    <DialogPrimitive.Root open={expanded} onOpenChange={setExpanded}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          aria-label={`Now playing — ${song.name}`}
          className="fixed inset-0 isolate z-50 flex flex-col overflow-y-auto bg-background outline-none duration-500 ease-lazy data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-8 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8"
        >
          {/* ── Ambient: the cover's own colour fills the room — the same
              Cover Ambient material as the album screen, one recipe ── */}
          {cover && <AlbumAmbient cover={coverUrl(cover)} />}

          {/* ── Chrome: collapse + context ── */}
          <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:max-w-6xl">
            <DialogPrimitive.Close
              render={
                <Button
                  variant="glass-ink"
                  size="icon-lg"
                  aria-label="Close player"
                  className="size-11 rounded-full"
                />
              }
            >
              <CaretDown size={20} weight="bold" aria-hidden />
            </DialogPrimitive.Close>
            {contextLabel && (
              <p className="min-w-0 flex-1 truncate text-center text-[13px] font-medium text-foreground/80">
                Playing from{" "}
                <span lang={isJapanese(contextLabel) ? "ja" : undefined}>
                  {contextLabel}
                </span>
              </p>
            )}
            <Button
              variant={showLyrics ? "action" : "glass-ink"}
              size="icon-lg"
              aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
              aria-pressed={showLyrics}
              onClick={() => setShowLyrics((v) => !v)}
              // Desktop shows lyrics beside the cover permanently — the flip
              // is a phone affordance.
              className="size-11 shrink-0 rounded-full lg:hidden"
            >
              {/* Mic = lyrics/sing-along — the convention the old site used
                  too; a bare quote glyph read as nothing to actual users. */}
              <MicrophoneStage size={20} weight="fill" aria-hidden />
            </Button>
          </header>

          {/* ── Cover ⇄ lyrics · identity · transport. Phones flip between a
              big cover and a lyrics-first view (thumbnail row + full-height
              list). Desktop (lg+) is ONE view: cover + caption left, lyrics
              right, and the control strip (spectrum · seek · transport)
              spanning the bottom of the same rail as the header. ── */}
          <div
            className={cn(
              "mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-evenly gap-6 px-6 py-6 sm:gap-8 sm:px-8 sm:py-8",
              "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-16 lg:gap-y-6",
            )}
          >
            {showLyrics ? (
              <>
                {/* Identity: thumbnail row on phones; a proper cover +
                    centered caption filling the upper-left cell on desktop. */}
                <div className="flex w-full max-w-xl shrink-0 items-center gap-3.5 lg:col-start-1 lg:row-start-1 lg:max-w-none lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:self-stretch">
                  <div className="relative aspect-square w-12 shrink-0 overflow-hidden rounded-[10px] bg-secondary shadow-postcard lg:w-[min(18rem,30vh)] lg:rounded-[20px]">
                    {cover && (
                      <FadeImage
                        src={coverUrl(cover)}
                        sizes="(min-width: 1024px) 288px, 48px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 lg:w-full lg:text-center">
                    <h2
                      lang={isJapanese(song.name) ? "ja" : undefined}
                      className="truncate font-display text-[17px] leading-snug font-medium text-foreground lg:text-[1.375rem] lg:leading-[1.25]"
                    >
                      {song.name}
                    </h2>
                    <p
                      lang={
                        albumName && isJapanese(albumName) ? "ja" : undefined
                      }
                      className="truncate text-[13px] text-foreground/80 lg:mt-1 lg:text-sm"
                    >
                      {ARTIST}
                      {albumName ? ` — ${albumName}` : ""}
                    </p>
                  </div>
                </div>
                <LyricsPanel
                  songId={song.id}
                  className="min-h-0 w-full max-w-xl flex-1 lg:col-start-2 lg:row-start-1 lg:max-w-none lg:self-stretch"
                />
              </>
            ) : (
              <>
                {/* `contents` keeps the phone flex layout flat; on lg this
                    becomes the left cell: artwork with its caption beneath. */}
                <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-h-0 lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:self-stretch">
                  <div className="relative aspect-square w-[min(78vw,38vh)] shrink-0 overflow-hidden rounded-[20px] bg-secondary shadow-postcard sm:w-[min(52vw,44vh)] lg:w-[min(18rem,30vh)]">
                    {cover && (
                      <FadeImage
                        src={coverUrl(cover)}
                        priority
                        sizes="(max-width: 640px) 78vw, 44vh"
                      />
                    )}
                  </div>
                  <div className="hidden text-center lg:block">
                    <h2
                      lang={isJapanese(song.name) ? "ja" : undefined}
                      className="font-display text-[1.375rem] leading-[1.25] font-medium text-foreground [text-wrap:balance]"
                    >
                      {song.name}
                    </h2>
                    <p
                      lang={
                        albumName && isJapanese(albumName) ? "ja" : undefined
                      }
                      className="mt-1 truncate text-sm text-foreground/80"
                    >
                      {ARTIST}
                      {albumName ? ` — ${albumName}` : ""}
                    </p>
                  </div>
                </div>
                {/* Desktop always keeps the words beside the cover.
                    max-lg:hidden (not `hidden lg:block`) so each panel state
                    keeps its own display type — the empty state is a grid. */}
                <LyricsPanel
                  songId={song.id}
                  className="max-lg:hidden lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:self-stretch"
                />
              </>
            )}

            {/* Control strip: on lg it always spans the stage bottom, with
                the spectrum breathing just above the scrubber. */}
            <div className="w-full max-w-xl shrink-0 lg:col-span-full lg:col-start-1 lg:row-start-2 lg:max-w-none">
              {!showLyrics && (
                <div className="text-center lg:hidden">
                  <h2
                    lang={isJapanese(song.name) ? "ja" : undefined}
                    className="font-display text-2xl leading-[1.2] font-medium text-foreground sm:text-[1.75rem] [text-wrap:balance]"
                  >
                    {song.name}
                  </h2>
                  <p
                    lang={albumName && isJapanese(albumName) ? "ja" : undefined}
                    className="mt-1.5 truncate text-[15px] text-foreground/85"
                  >
                    {ARTIST}
                    {albumName ? ` — ${albumName}` : ""}
                  </p>
                </div>
              )}

              <Spectrum className="hidden h-12 lg:block" />
              <SeekBar />
              <TransportControls />
              <VolumeControl />
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Seek with the draft → commit → catch-up pattern (ported from the old
 * player): dragging only moves a local value; releasing seeks the audio and
 * pins the slider until real progress catches up, so it never snaps back to
 * a stale position.
 */
function SeekBar() {
  const currentTime = useProgressStore((s) => s.currentTime);
  const duration = useDuration();
  const seek = usePlayerStore((s) => s.seek);

  const [draft, setDraft] = useState<number | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);
  const commitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (committed === null) return;
    if (Math.abs(currentTime - committed) < 0.35) setCommitted(null);
  }, [currentTime, committed]);

  useEffect(
    () => () => {
      if (commitTimeout.current) clearTimeout(commitTimeout.current);
    },
    [],
  );

  const shown = draft ?? committed ?? currentTime;

  return (
    <div className="mt-7">
      <Scrubber
        label="Seek"
        min={0}
        max={Math.max(duration, 1)}
        step={1}
        value={Math.min(shown, Math.max(duration, 1))}
        onValueChange={(value) => {
          setDraft(Array.isArray(value) ? value[0] : value);
        }}
        onValueCommitted={(value) => {
          const time = Array.isArray(value) ? value[0] : value;
          setDraft(null);
          setCommitted(time);
          seek(time);
          // Never pin longer than 2s, even if progress reports oddly.
          if (commitTimeout.current) clearTimeout(commitTimeout.current);
          commitTimeout.current = setTimeout(() => setCommitted(null), 2000);
        }}
      />
      <div className="mt-1.5 flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
        <span>{formatDuration(shown)}</span>
        <span>{duration > 0 ? formatDuration(duration) : "–:––"}</span>
      </div>
    </div>
  );
}

function TransportControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const repeatLabel =
    repeat === "off"
      ? "Repeat off — enable repeat all"
      : repeat === "all"
        ? "Repeat all — enable repeat one"
        : "Repeat one — disable repeat";

  return (
    <div className="mt-4 flex items-center justify-between sm:justify-center sm:gap-6">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
        aria-pressed={shuffle}
        onClick={() => toggleShuffle()}
        className={cn(
          "relative size-11 rounded-full",
          // Active mode state: tinted fill + a dot under the icon, not just
          // a colour shift (which read as nothing at a glance).
          shuffle
            ? "bg-primary/12 text-primary hover:bg-primary/20"
            : "text-foreground/70",
        )}
      >
        <Shuffle size={22} aria-hidden />
        {shuffle && (
          <span
            aria-hidden
            className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary"
          />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Previous track"
        onClick={() => prev()}
        className="size-12 rounded-full text-foreground"
      >
        <SkipBack size={26} weight="fill" aria-hidden />
      </Button>
      <Button
        variant="action"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={() => toggle()}
        className="size-16 rounded-full shadow-lift-ocean hover:-translate-y-0.5"
      >
        {isPlaying ? (
          <Pause size={28} weight="fill" aria-hidden className="size-7" />
        ) : (
          <Play size={28} weight="fill" aria-hidden className="size-7" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Next track"
        onClick={() => next()}
        className="size-12 rounded-full text-foreground"
      >
        <SkipForward size={26} weight="fill" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={repeatLabel}
        aria-pressed={repeat !== "off"}
        onClick={() => cycleRepeat()}
        className={cn(
          "relative size-11 rounded-full",
          repeat !== "off"
            ? "bg-primary/12 text-primary hover:bg-primary/20"
            : "text-foreground/70",
        )}
      >
        {repeat === "one" ? (
          <RepeatOnce size={22} aria-hidden />
        ) : (
          <Repeat size={22} aria-hidden />
        )}
        {repeat !== "off" && (
          <span
            aria-hidden
            className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary"
          />
        )}
      </Button>
    </div>
  );
}

function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  return (
    // Phones control volume with hardware buttons; show this from sm up.
    <div className="mx-auto mt-5 hidden w-full max-w-xs items-center gap-3 sm:flex">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={() => toggleMute()}
        className="rounded-full text-foreground/70"
      >
        {muted ? (
          <SpeakerSlash size={18} aria-hidden />
        ) : (
          <SpeakerHigh size={18} aria-hidden />
        )}
      </Button>
      <Scrubber
        label="Volume"
        min={0}
        max={100}
        step={1}
        value={muted ? 0 : Math.round(volume * 100)}
        onValueChange={(value) => {
          const v = Array.isArray(value) ? value[0] : value;
          setVolume(v / 100);
        }}
      />
    </div>
  );
}
