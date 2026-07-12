"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/api/types";
import { usePlayerStore } from "@/lib/player/store";

/**
 * Playback wiring for one edition: the server page flattens the edition's
 * discs into a queue-ready song list (cover + album name denormalized in) and
 * provides it here once, so every TrackRow and the Play button can start
 * playback without each row carrying the whole list as props.
 */

type EditionPlayback = { songs: Song[]; label: string };

const PlaybackContext = createContext<EditionPlayback | null>(null);

export function EditionPlaybackProvider({
  songs,
  label,
  children,
}: EditionPlayback & { children: React.ReactNode }) {
  return (
    <PlaybackContext.Provider value={{ songs, label }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function useEditionPlayback(): EditionPlayback {
  const ctx = useContext(PlaybackContext);
  if (!ctx)
    throw new Error("useEditionPlayback outside EditionPlaybackProvider");
  return ctx;
}

/** Is the loaded queue this edition's? (first song + label identify it) */
function useIsThisEdition(songs: Song[], label: string): boolean {
  return usePlayerStore(
    (s) =>
      s.contextLabel === label &&
      s.context.length === songs.length &&
      s.context[0]?.id === songs[0]?.id,
  );
}

/** The album rail's Play — starts the edition, or pauses/resumes it. */
export function PlayEditionButton() {
  const { songs, label } = useEditionPlayback();
  const isThisEdition = useIsThisEdition(songs, label);
  const isPlaying = usePlayerStore((s) => s.isPlaying) && isThisEdition;
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  return (
    <Button
      type="button"
      variant="action"
      aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
      onClick={() => {
        if (isThisEdition) toggle();
        else playQueue(songs, 0, label);
      }}
      className="h-12 gap-2 rounded-full pr-6 pl-5 text-[15px] font-semibold shadow-lift-ocean"
    >
      {isPlaying ? (
        <Pause className="size-5" weight="fill" aria-hidden />
      ) : (
        <Play className="size-5" weight="fill" aria-hidden />
      )}
      {isPlaying ? "Pause" : "Play"}
    </Button>
  );
}
