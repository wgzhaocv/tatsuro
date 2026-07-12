import type React from "react";
import { cn } from "@/lib/utils";

/**
 * The frosted sheet material shared by photo-backed screens (home grid, album
 * tracklist): light white glass with a *subtle* blur (backdrop-blur-xs) so the
 * scene behind keeps its colour and shapes — Glass Discipline: one glass
 * layer, never glass on glass. Dusk swaps the fill to twilight navy. Radius,
 * shadow, and spacing stay at the call site; this owns only the material.
 */
export function GlassPanel({
  as: Tag = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn(
        "border border-white/55 bg-white/45 backdrop-blur-xs dark:border-white/15 dark:bg-dusk-navy/60",
        className,
      )}
      {...props}
    />
  );
}
