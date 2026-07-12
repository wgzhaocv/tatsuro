"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

/**
 * The signature progress/volume slider (DESIGN.md · Progress/Scrubber): a
 * 4px Sky track, the played span in the deep-water action gradient (state, so
 * deep water), and a white thumb lifted by an ocean glow. Shared by the
 * full player's seek bar and volume control.
 */
export function Scrubber({
  className,
  label,
  ...props
}: SliderPrimitive.Root.Props & { className?: string; label: string }) {
  return (
    <SliderPrimitive.Root
      thumbAlignment="edge"
      className={cn("data-horizontal:w-full", className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-sky select-none dark:bg-white/20">
          <SliderPrimitive.Indicator className="h-full bg-[image:var(--gradient-action)] select-none" />
        </SliderPrimitive.Track>
        {/* The thumb wraps the focusable input — the accessible name lives here. */}
        <SliderPrimitive.Thumb
          aria-label={label}
          className="block size-3.5 shrink-0 rounded-full bg-white shadow-lift-ocean ring-ring/40 transition-shadow select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
