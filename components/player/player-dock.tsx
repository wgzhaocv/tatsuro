"use client";

import { usePathname } from "next/navigation";
import { usePlayerStore } from "@/lib/player/store";
import { FullPlayer } from "./full-player";
import { MiniPlayer } from "./mini-player";

/**
 * The player chrome that lives in the (main) layout: the persistent mini bar
 * and the full-screen player it expands into. While a queue is loaded a
 * spacer holds the bar's height in the document flow, so page content
 * (tracklist footers, grids) never hides underneath the fixed bar.
 *
 * On a video watch screen (/mv/:id) the dock steps aside entirely — the video
 * owns the stage there, and MvWatch pauses the music on entry so no audio
 * plays without visible controls.
 */
export function PlayerDock() {
  const hasSong = usePlayerStore((s) => s.current !== null);
  const pathname = usePathname();
  if (/^\/mv\/[^/]+$/.test(pathname)) return null;

  return (
    <>
      <div
        aria-hidden
        className={
          hasSong ? "h-[5rem] shrink-0 transition-[height]" : "h-0 shrink-0"
        }
      />
      <MiniPlayer />
      <FullPlayer />
    </>
  );
}
