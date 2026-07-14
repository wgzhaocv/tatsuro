"use client";

import { useEffect } from "react";

/**
 * A shared-song link lands on the album with `?song=<id>` (old-site style, no
 * dedicated route). This scrolls that track into view and briefly flashes it so
 * the recipient sees which song the link was for.
 *
 * Reads the query straight off `window.location` in an effect rather than
 * `useSearchParams()` on purpose: the album page is statically generated
 * (generateStaticParams), and useSearchParams would opt the route into dynamic
 * rendering under Cache Components. A runtime DOM read is invisible to the
 * prerender. Renders nothing.
 */
export function SharedSongHighlight() {
  useEffect(() => {
    const songId = new URLSearchParams(window.location.search).get("song");
    if (!songId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-song-id="${CSS.escape(songId)}"]`,
    );
    if (!el) return;

    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    // Let the tracklist paint + any route-restore scroll settle first.
    const enter = setTimeout(() => {
      el.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });
      el.dataset.shared = "true";
    }, 250);
    const leave = setTimeout(() => {
      delete el.dataset.shared;
    }, 4500);

    return () => {
      clearTimeout(enter);
      clearTimeout(leave);
    };
  }, []);

  return null;
}
