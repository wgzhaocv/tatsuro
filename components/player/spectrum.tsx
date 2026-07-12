"use client";

import { useEffect, useRef } from "react";
import { getAnalyser } from "@/lib/player/analyser";
import { usePlayerStore } from "@/lib/player/store";
import { cn } from "@/lib/utils";

// Shallow-water palette (decorative only — Deep Water Rule): the bars carry
// no information beyond "the sea is moving".
const BAR_FROM = "#1CA7C4"; // ocean
const BAR_TO = "#2FBFA8"; // turquoise

/**
 * A frequency spectrum that breathes with the music: rounded bars fed by the
 * engine's AnalyserNode, drawn on canvas at display resolution. Purely
 * decorative — it fades out (CSS) when paused and renders nothing at all
 * under prefers-reduced-motion or when Web Audio is unavailable.
 */
export function Spectrum({
  className,
  bars = 96,
}: {
  className?: string;
  bars?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!isPlaying) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const analyser = getAnalyser();
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      analyser.getByteFrequencyData(data);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, BAR_FROM);
      gradient.addColorStop(1, BAR_TO);
      ctx.fillStyle = gradient;

      const gap = 4;
      const barWidth = (width - gap * (bars - 1)) / bars;
      // Log-spaced bins: linear mapping parks the whole bassline in the
      // first few bars (which then just sit at full height). Skip the
      // always-hot lowest bins, stop before the hissy top, and give each
      // bar the loudest bin in its log-spaced slice.
      const minBin = 3;
      const maxBin = Math.floor(data.length * 0.72);
      const ratio = maxBin / minBin;
      for (let i = 0; i < bars; i++) {
        const from = Math.floor(minBin * ratio ** (i / bars));
        const to = Math.max(
          from + 1,
          Math.floor(minBin * ratio ** ((i + 1) / bars)),
        );
        let peak = 0;
        for (let b = from; b < to; b++) peak = Math.max(peak, data[b]);
        // A touch of gamma keeps quiet passages visibly alive without
        // letting loud ones flatline at the ceiling.
        const level = (peak / 255) ** 1.6;
        const barHeight = Math.max(2, level * height);
        const x = i * (barWidth + gap);
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, bars]);

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
