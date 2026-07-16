"use client";

import { useEffect } from "react";
import { onHighlightSong, scrollAndFlash } from "@/lib/player/highlight";

/**
 * Flashes the track a "which song?" jump points at, on the album *and* playlist
 * screens (both render track rows carrying `data-song-id`).
 *
 * Two entry paths: a cold open — a shared link, or a full page load — carries
 * the id in `?song=` and mounts this fresh; an in-app jump ("view album", "go
 * to source") fires a highlight event after navigating, because the target page
 * may already be cached by <Activity> and won't remount. See lib/player/highlight.
 * Renders nothing.
 */
export function SharedSongHighlight() {
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("song");
    const cleanupMount = fromUrl ? scrollAndFlash(fromUrl) : undefined;

    let cleanupEvent: (() => void) | undefined;
    const off = onHighlightSong((id) => {
      cleanupEvent?.();
      cleanupEvent = scrollAndFlash(id);
    });

    return () => {
      cleanupMount?.();
      cleanupEvent?.();
      off();
    };
  }, []);

  return null;
}
