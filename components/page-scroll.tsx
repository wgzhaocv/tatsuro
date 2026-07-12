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

    window.scrollTo(0, saved.current);

    const record = () => {
      if (el.checkVisibility()) saved.current = window.scrollY;
    };
    window.addEventListener("scroll", record, { passive: true });
    return () => window.removeEventListener("scroll", record);
  }, []);

  return <span ref={marker} aria-hidden className="absolute size-0" />;
}
