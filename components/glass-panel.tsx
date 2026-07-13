import type React from "react";
import { cn } from "@/lib/utils";

/**
 * The frosted sheet material — the single source of truth for glass surfaces
 * (home grid panel, album tracklist, search palette, Select dropdowns…): light
 * white glass with a *subtle* blur so the scene behind keeps its colour, dusk
 * swaps the fill to twilight navy. Glass Discipline: one glass layer, never
 * glass on glass. Reuse this class instead of re-deriving the material so every
 * floating surface reads the same. Radius/shadow/spacing stay at the call site.
 */
export const glassSurface =
  "border border-white/55 bg-white/45 backdrop-blur-xs dark:border-white/15 dark:bg-dusk-navy/60";

export function GlassPanel({
  as: Tag = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: React.ElementType }) {
  return <Tag className={cn(glassSurface, className)} {...props} />;
}
