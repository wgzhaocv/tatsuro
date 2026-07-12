"use client";

import { type RefObject, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

// How long after entering the page a scroll may still fire. Covers a hard
// reload too, where the persisted queue rehydrates just after first paint.
const ENTRY_WINDOW_MS = 1500;

/**
 * Scroll a track row into view when the listener *arrives* on a list that
 * contains the playing song — and only then. Guardrails that keep it polite:
 * it only fires within a short window after entry (a track change while
 * browsing never yanks the page), skips entirely when the row is already
 * comfortably visible, centers the row, and drops to an instant jump under
 * prefers-reduced-motion.
 *
 * "Entry" is the empty-deps effect below: it runs on mount and again when
 * the router re-shows a cached page (Next keeps visited pages alive in an
 * <Activity>, so refs survive navigation — effects re-running on show is the
 * only reliable arrival signal).
 */
export function useScrollToCurrentOnEnter(
  ref: RefObject<HTMLElement | null>,
  isCurrent: boolean,
) {
  const enteredAt = useRef(0);
  useEffect(() => {
    enteredAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isCurrent) return;
    if (Date.now() - enteredAt.current > ENTRY_WINDOW_MS) return;
    // A beat later than the router's own scroll-to-top on navigation, which
    // would otherwise cancel this scroll.
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      // Already in comfortable view (clear of the header and the mini bar)?
      const rect = el.getBoundingClientRect();
      const margin = 96;
      if (rect.top >= margin && rect.bottom <= window.innerHeight - margin)
        return;
      el.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [isCurrent, ref]);
}
