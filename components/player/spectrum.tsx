"use client";

import { useEffect, useRef, useState } from "react";
import { getAnalyser } from "@/lib/player/analyser";
import { usePlayerStore } from "@/lib/player/store";
import { cn, prefersReducedMotion } from "@/lib/utils";

// Shallow-water palette (decorative only — Deep Water Rule): the bars carry
// no information beyond "the sea is moving". Literal hex is the documented
// pattern here: @theme inline brand tokens have no runtime CSS variable, and
// canvas fillStyle needs a real color string.
const BAR_FROM = "#1CA7C4"; // ocean
const BAR_TO = "#2FBFA8"; // turquoise
const BARS = 96;

/**
 * A frequency spectrum that breathes with the music: rounded bars fed by the
 * engine's AnalyserNode, drawn on canvas at display resolution. Purely
 * decorative — it fades out (CSS) when paused and doesn't run at all under
 * prefers-reduced-motion, below the lg breakpoint (where it's also hidden by
 * CSS), or when Web Audio is unavailable.
 */
export function Spectrum({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // The strip is desktop-only; the draw loop must know that too, or phones
  // would spin an invisible 60fps rAF behind the display:none.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isPlaying || !isDesktop || prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let data: Uint8Array<ArrayBuffer> | null = null;
    // Per-frame constants, built once (and the gradient again on resize).
    let gradient: CanvasGradient | null = null;
    let binRanges: [number, number][] | null = null;
    // Displayed level per bar, eased between frames (fast attack, slow
    // release) so the strip pulses with the beat instead of flickering.
    const shown = new Float32Array(BARS);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      // The analyser is built inside the engine's onPlay gesture, which can
      // land *after* this effect runs (always, in production — dev's strict
      // double-effects masked it). Keep polling until it exists.
      const analyser = getAnalyser();
      if (!analyser) return;
      data ??= new Uint8Array(analyser.frequencyBinCount);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        gradient = null;
      }
      if (!gradient) {
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, BAR_FROM);
        gradient.addColorStop(1, BAR_TO);
      }
      // Log-spaced bins: linear mapping parks the whole bassline in the
      // first few bars (which then just sit at full height). Skip the
      // always-hot lowest bins and stop before the hissy top.
      if (!binRanges) {
        const minBin = 3;
        const maxBin = Math.floor(data.length * 0.72);
        const ratio = maxBin / minBin;
        binRanges = Array.from({ length: BARS }, (_, i) => {
          const from = Math.floor(minBin * ratio ** (i / BARS));
          const to = Math.max(
            from + 1,
            Math.floor(minBin * ratio ** ((i + 1) / BARS)),
          );
          return [from, to];
        });
      }
      analyser.getByteFrequencyData(data);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = gradient;

      const gap = 4;
      const barWidth = (width - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        const [from, to] = binRanges[i];
        let peak = 0;
        for (let b = from; b < to; b++) peak = Math.max(peak, data[b]);
        // A touch of gamma keeps quiet passages visibly alive without
        // letting loud ones flatline at the ceiling.
        const level = (peak / 255) ** 1.6;
        // Fast attack, slow release: beats still land, micro-jitter doesn't.
        shown[i] += (level - shown[i]) * (level > shown[i] ? 0.45 : 0.12);
        const barHeight = Math.max(2, shown[i] * height);
        const x = i * (barWidth + gap);
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, isDesktop]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "block w-full transition-opacity duration-600 ease-lazy",
        isPlaying ? "opacity-60 dark:opacity-70" : "opacity-0",
        className,
      )}
    />
  );
}
