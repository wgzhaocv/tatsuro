"use client";

import { useEffect } from "react";

/**
 * Pins the bottom-docked chrome (mini player + phone tab bar) to the *visual*
 * viewport's bottom edge.
 *
 * iOS anchors `position: fixed` to the layout viewport, not the visual one, so
 * when the browser's bottom toolbar shows/hides on scroll the docked bars
 * detach: mid-gesture iOS freezes them, and at rest they occasionally settle
 * above the true bottom, leaving a strip of page showing beneath them. There's
 * no CSS anchor for the visual viewport, so we measure the gap between the two
 * viewports with the visualViewport API and publish it as `--dock-inset-bottom`
 * (signed px). The bars add it to their own `bottom`, riding back to the real
 * edge. A no-op where visualViewport is missing — the vars default to 0px, i.e.
 * plain `bottom: 0`.
 */
export function ViewportDockSync() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      raf = 0;
      // Don't fight pinch-zoom: the offsets get large and the bars would leap.
      const inset =
        vv.scale > 1 ? 0 : root.clientHeight - (vv.offsetTop + vv.height);
      root.style.setProperty("--dock-inset-bottom", `${inset}px`);
    };
    // Coalesce bursts of resize/scroll into one write per frame.
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      root.style.removeProperty("--dock-inset-bottom");
    };
  }, []);

  return null;
}
