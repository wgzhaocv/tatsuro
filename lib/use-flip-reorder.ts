"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { prefersReducedMotion } from "@/lib/utils";

/** House lazy tempo (DESIGN.md motion: 400–600ms, ease-lazy). */
const DURATION_MS = 600;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * FLIP reorder for a grid/list, driven straight off the live DOM — no View
 * Transition, so it never snapshots the page (which on a fixed blurred hero +
 * backdrop-blur panel drops the blur and blinks fixed chrome). Each animatable
 * child carries `data-flip-id`; when `orderKey` changes, every child that moved
 * tweens from its old box to its new one via the Web Animations API.
 *
 * `orderKey` is the reorder signal (e.g. the joined id order): the measure pass
 * runs when it changes. A resize listener refreshes the stored boxes without
 * animating, so the next reorder measures against the current layout, not a
 * pre-resize one. reduced-motion skips the tween (the reorder still applies).
 */
export function useFlipReorder(
  containerRef: RefObject<HTMLElement | null>,
  orderKey: string,
): void {
  const boxes = useRef<Map<string, DOMRect>>(new Map());
  const prevKey = useRef(orderKey);

  const measure = useCallback(() => {
    const next = new Map<string, DOMRect>();
    const el = containerRef.current;
    if (el) {
      for (const node of el.querySelectorAll<HTMLElement>("[data-flip-id]")) {
        const id = node.dataset.flipId;
        if (id) next.set(id, node.getBoundingClientRect());
      }
    }
    return next;
  }, [containerRef]);

  // Keep stored boxes current across resizes (no animation) so a later reorder
  // doesn't tween from a stale, pre-resize layout.
  useEffect(() => {
    const onResize = () => {
      boxes.current = measure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const changed = prevKey.current !== orderKey;
    prevKey.current = orderKey;
    const prev = boxes.current;
    const next = measure();
    boxes.current = next;

    // Only a real reorder animates — not the mount, nor an unrelated re-render.
    if (!changed || prev.size === 0 || prefersReducedMotion()) return;
    for (const node of el.querySelectorAll<HTMLElement>("[data-flip-id]")) {
      const id = node.dataset.flipId;
      const old = id ? prev.get(id) : undefined;
      const cur = id ? next.get(id) : undefined;
      if (!old || !cur) continue;
      const dx = old.left - cur.left;
      const dy = old.top - cur.top;
      if (dx === 0 && dy === 0) continue;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: DURATION_MS, easing: EASING },
      );
    }
  }, [orderKey, containerRef, measure]);
}
