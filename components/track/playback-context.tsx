"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { createContext, useContext, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/api/types";
import { usePlayerStore } from "@/lib/player/store";

/**
 * Playback wiring for one queue — an album edition, or a playlist. The screen
 * flattens its songs into a queue-ready list (cover + album name denormalized
 * in) and provides it here once, so every TrackRow and the Play button start
 * playback without each row carrying the whole list as props. Generalized from
 * the album's edition context so playlists reuse the same rows and button.
 *
 * `queueId` is the queue's *stable* identity (edition id / playlist id), kept
 * separate from the display `label`: renaming a playlist or switching locale
 * changes the label but not which queue is loaded. `href` is the locale-less
 * route back to this queue's source, so the player can link "playing from".
 */

type QueuePlayback = {
  songs: Song[];
  label: string;
  queueId: string;
  href: string;
};

const QueueContext = createContext<QueuePlayback | null>(null);

export function QueuePlaybackProvider({
  songs,
  label,
  queueId,
  href,
  children,
}: QueuePlayback & { children: React.ReactNode }) {
  // Memoized so a provider re-render with the same queue doesn't hand every
  // consuming row a fresh context object (memo'd TrackRows would all re-render
  // for nothing).
  const value = useMemo(
    () => ({ songs, label, queueId, href }),
    [songs, label, queueId, href],
  );
  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}

export function useQueuePlayback(): QueuePlayback {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueuePlayback outside QueuePlaybackProvider");
  return ctx;
}

/** Is this queue the one loaded in the player? Compared by stable id, so a
 *  rename / locale switch / add-remove of the playing queue never de-syncs. */
export function useIsThisQueue(queueId: string): boolean {
  return usePlayerStore((s) => s.contextId != null && s.contextId === queueId);
}

/**
 * The big Play control for a queue's header: starts this queue, or pauses/
 * resumes it when it's already loaded. Both label texts are passed in (the
 * server can't know the live play state), and the client picks — so this works
 * under a server-rendered album page and a client-rendered playlist alike.
 */
export function PlayQueueButton({
  playText,
  pauseText,
  disabled,
}: {
  playText: string;
  pauseText: string;
  disabled?: boolean;
}) {
  const { songs, label, queueId, href } = useQueuePlayback();
  const isThisQueue = useIsThisQueue(queueId);
  const isPlaying = usePlayerStore((s) => s.isPlaying) && isThisQueue;
  const playQueue = usePlayerStore((s) => s.playQueue);
  const toggle = usePlayerStore((s) => s.toggle);

  return (
    <Button
      type="button"
      variant="action"
      disabled={disabled || songs.length === 0}
      onClick={() => {
        if (isThisQueue) toggle();
        else playQueue(songs, 0, label, queueId, href);
      }}
      className="h-12 gap-2 rounded-full pr-6 pl-5 text-[15px] font-semibold shadow-lift-ocean"
    >
      {isPlaying ? (
        <Pause className="size-5" weight="fill" aria-hidden />
      ) : (
        <Play className="size-5" weight="fill" aria-hidden />
      )}
      {isPlaying ? pauseText : playText}
    </Button>
  );
}
