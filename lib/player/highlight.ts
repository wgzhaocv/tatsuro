"use client";

import { prefersReducedMotion } from "@/lib/utils";

// Scroll a track row into view and briefly flash it — the "which song?" cue
// shared by shared-song links (?song=) and in-app "view album / go to source"
// jumps. Kept out of useSearchParams on purpose: the album route is statically
// generated, and reading search params there would opt it into dynamic
// rendering under Cache Components. See components/album/shared-song-highlight.

const EVENT = "highlight-song";

/**
 * Ask any mounted SharedSongHighlight to flash a song. Used after an in-app
 * navigation whose target page may already be cached by React <Activity> and so
 * won't re-run its mount effect (a fresh load reads ?song instead).
 */
export function highlightSong(songId: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: songId }));
}

/** Subscribe to highlightSong(); returns an unsubscribe. */
export function onHighlightSong(handler: (songId: string) => void): () => void {
  const listener = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) handler(id);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Navigate to a page (locale-aware router) and flash `songId` there: the
 *  ?song= param covers a cold load, the event a warm re-show of a cached page.
 *  The one place the "deep-link to a song" convention lives. */
export function jumpToSong(
  router: { push: (href: string) => void },
  href: string,
  songId: string,
): void {
  router.push(`${href}?song=${songId}`);
  highlightSong(songId);
}

const isVisible = (el: HTMLElement) =>
  typeof el.checkVisibility === "function"
    ? el.checkVisibility()
    : el.offsetParent !== null;

/**
 * Scroll the row carrying `data-song-id` into view and flash it for ~4s.
 * Looks after a short delay (so it lands past any route-restore scroll) and
 * keeps retrying briefly, since an in-app jump to a never-visited album may not
 * have painted the tracklist yet. Picks the *visible* match — the same id can
 * exist on an <Activity>-cached hidden page. Returns a cleanup that clears the
 * timers and un-flashes the row (so a follow-up flash can't strand this tint).
 * Reduced motion jumps instead of animating.
 */
export function scrollAndFlash(songId: string): () => void {
  const smooth = !prefersReducedMotion();
  const selector = `[data-song-id="${CSS.escape(songId)}"]`;
  let flashed: HTMLElement | null = null;
  let raf = 0;
  let leave: ReturnType<typeof setTimeout> | undefined;
  const deadline = performance.now() + 2000;

  const attempt = () => {
    const el = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    ).find(isVisible);
    if (!el) {
      if (performance.now() < deadline) raf = requestAnimationFrame(attempt);
      return;
    }
    flashed = el;
    el.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "center",
    });
    el.dataset.shared = "true";
    leave = setTimeout(() => {
      delete el.dataset.shared;
      flashed = null;
    }, 4000);
  };

  // Let a fresh mount paint + any route-restore scroll settle before looking.
  const start = setTimeout(() => {
    raf = requestAnimationFrame(attempt);
  }, 250);

  return () => {
    clearTimeout(start);
    cancelAnimationFrame(raf);
    if (leave) clearTimeout(leave);
    if (flashed) delete flashed.dataset.shared;
  };
}
