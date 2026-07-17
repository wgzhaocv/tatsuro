"use client";

// Pull the cover's leading colour on the client, so the mini player bar can
// wear a faint cast of whatever song is playing — the trick the old site used
// on its full-screen player (an OffscreenCanvas worker reading the artwork's
// most-frequent quantised colour). Here it stays main-thread: the work is a
// 48×48 read (~2k pixels) and createImageBitmap already decodes off-thread, so
// a worker would cost more plumbing than it saves.
//
// Two changes from the old recipe: we fetch the image to a same-origin blob
// first (so the canvas never taints, regardless of the cover host's CORS) and
// we weight buckets by saturation, so a vivid minority beats a flat grey/white
// majority — a muddy near-grey tint reads as "broken", a lively one as intent.

import { useEffect, useState } from "react";

// Module-scoped so a colour is computed once per cover across every mount and
// every song revisit — the bar remounts nothing, but revisiting a track (or a
// second player instance) reuses the result instead of refetching.
const cache = new Map<string, string>();

/**
 * The dominant colour of `src` as a `#rrggbb` hex, or `null` while it resolves
 * / if it can't (unsupported browser, fetch or decode failure) — callers should
 * treat `null` as "no tint" and fall back to their neutral material.
 */
export function useDominantColor(
  src: string | null | undefined,
): string | null {
  const [color, setColor] = useState<string | null>(() =>
    src ? (cache.get(src) ?? null) : null,
  );

  useEffect(() => {
    if (!src) {
      setColor(null);
      return;
    }
    const cached = cache.get(src);
    if (cached) {
      setColor(cached);
      return;
    }
    // SSR / older browsers: leave the tint off rather than throw.
    if (
      typeof createImageBitmap !== "function" ||
      typeof OffscreenCanvas !== "function"
    ) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // force-cache: the cover is very likely already in the browser cache
        // from the <Image> that shows it, so this rarely costs a real request.
        const res = await fetch(src, { cache: "force-cache" });
        if (!res.ok) return;
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob, {
          resizeWidth: 48,
          resizeHeight: 48,
          resizeQuality: "low",
        });
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          bitmap.close();
          return;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hex = pickDominant(data);
        if (hex) cache.set(src, hex);
        if (!cancelled && hex) setColor(hex);
      } catch {
        // CORS / decode / read failure — the caller keeps its neutral material.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}

/**
 * Saturation-weighted mode over 12-bit (4-bits-per-channel) colour buckets.
 * Near-black and near-white pixels are dropped so a black gutter or a white
 * border can't win, and each pixel's vote scales with its saturation so the
 * chosen bucket leans toward the cover's actual colour, not its neutrals.
 */
function pickDominant(data: Uint8ClampedArray): string | null {
  const buckets = new Map<
    number,
    { weight: number; r: number; g: number; b: number }
  >();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue; // transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 24 || min > 235) continue; // near-black / near-white neutrals
    const sat = max === 0 ? 0 : (max - min) / max;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
    // A flat pixel still counts (1), a vivid one counts up to 4×.
    const w = 1 + sat * 3;
    bucket.weight += w;
    bucket.r += r * w;
    bucket.g += g * w;
    bucket.b += b * w;
    buckets.set(key, bucket);
  }

  let best: { weight: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }
  if (!best) return null; // an all-neutral cover: no meaningful tint

  // Average within the winning bucket for a truer colour than the bucket centre.
  const r = Math.round(best.r / best.weight);
  const g = Math.round(best.g / best.weight);
  const b = Math.round(best.b / best.weight);
  return refine(r, g, b);
}

/**
 * Clean the raw dominant colour into something that reads as a *tint* rather
 * than mud: floor the saturation and pin the lightness into a mid band. A flat
 * or dark cover colour, washed at low opacity over glass, otherwise turns grey
 * — this keeps the cast lively and consistent whatever the artwork is.
 */
function refine(r: number, g: number, b: number): string {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.max(s, 0.5);
  l = Math.min(Math.max(l, 0.5), 0.68);
  const [nr, ng, nb] = hslToRgb(h, s, l);
  return `#${((1 << 24) | (nr << 16) | (ng << 8) | nb).toString(16).slice(1)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
