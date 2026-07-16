"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Owns the window scroll position for the route subtree it sits in. Next
 * keeps visited routes alive in an <Activity>, so this component isn't
 * unmounted on navigation — it's hidden, and its ref survives. That makes
 * per-page scroll memory trivial: remember the offset while the route is
 * visible, put it back when it shows again. A fresh mount (first visit, or
 * evicted from the route cache) starts at the top.
 *
 * The timing trap, observed with Next 16's route Activities: when the route
 * hides, the document shrinks to the incoming page and the browser clamps
 * the scroll offset — and that clamp fires a scroll event *before* React
 * runs this effect's cleanup. So neither reading scrollY on cleanup nor a
 * bare scroll listener records the true offset. The zero-size marker tells
 * us whether this page still has layout: scroll events that arrive after it
 * lost layout are the clamp, not the listener, and are ignored.
 *
 * Internal links pair this with scroll={false} (the app-wide default via
 * components/ui/link), and browser restoration is switched to manual — with
 * three parties fighting over the scroll position (browser, router, this),
 * navigations land somewhere arbitrary; with one owner they land where the
 * listener left off.
 *
 * The offset is mirrored to sessionStorage, keyed by pathname, not just held
 * in a ref. iOS Chrome's swipe-back gesture doesn't restore via bfcache like
 * the toolbar back button does — it re-runs the page, so the in-memory ref is
 * gone and a ref-only scheme snaps to the top. sessionStorage survives that
 * reload, so a fresh mount reads the last offset back and lands where the user
 * left off, matching the SPA back button.
 *
 * Mount once per scroll scope: in a page, or in a layout when sibling routes
 * (an album's editions) should share one position.
 */
export function PageScroll() {
  const saved = useRef(0);
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = marker.current;
    if (!el) return;
    window.history.scrollRestoration = "manual";

    // Key by the path captured at mount (locale prefix included is fine — it's
    // stable across a reload). A swipe-back reload remounts here and reads it.
    const key = `page-scroll:${window.location.pathname}`;
    const stored = sessionStorage.getItem(key);
    if (stored != null) saved.current = Number(stored) || 0;
    window.scrollTo(0, saved.current);

    const record = () => {
      if (!el.checkVisibility()) return;
      saved.current = window.scrollY;
      sessionStorage.setItem(key, String(window.scrollY));
    };
    window.addEventListener("scroll", record, { passive: true });
    return () => window.removeEventListener("scroll", record);
  }, []);

  return <span ref={marker} aria-hidden className="absolute size-0" />;
}
