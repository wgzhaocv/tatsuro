"use client";

import { flushSync } from "react-dom";
import { prefersReducedMotion } from "@/lib/utils";

type WithVT = Document & {
  startViewTransition?: (cb: () => void) => unknown;
};

/**
 * Run a state update inside a View Transition so the DOM reorder it triggers
 * animates (the browser tweens each `view-transition-name`d element from its old
 * box to its new one — a free FLIP). flushSync forces React to commit the update
 * synchronously inside the callback so the transition captures the *new* layout.
 *
 * Degrades cleanly: no API support, or reduced-motion, → just runs the update.
 * Used by the pin toggle so a pinned album slides to the front of the grid.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as WithVT;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}
