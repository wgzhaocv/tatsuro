"use client";

import Image, { type StaticImageData } from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The environment photo for the active theme — and only that one. The old
 * CSS-swap (two <Image>s, one display:none'd) made Chrome download both
 * full-viewport photos and tripped next/image's size check on the hidden
 * twin. This renders nothing until mounted (the base gradient shows for that
 * beat — next-themes sets the theme class pre-paint, so resolvedTheme is
 * ready immediately after hydration), then exactly one image, blur-in via
 * its placeholder. Toggling themes swaps the src, loading on demand.
 */
export function ThemeImage({
  noon,
  dusk,
  sizes,
  className,
  noonClassName,
  duskClassName,
}: {
  noon: StaticImageData;
  dusk: StaticImageData;
  sizes: string;
  className?: string;
  /** Per-theme crop/position (object-position differs per photo). */
  noonClassName?: string;
  duskClassName?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  return (
    <Image
      src={isDark ? dusk : noon}
      alt=""
      fill
      priority
      placeholder="blur"
      sizes={sizes}
      className={cn(
        "object-cover",
        className,
        isDark ? duskClassName : noonClassName,
      )}
    />
  );
}
