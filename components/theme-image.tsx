"use client";

import Image, { type StaticImageData } from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The environment photo for the active theme — and only that one. The old
 * CSS-swap (two <Image>s, one display:none'd) made Chrome download both
 * full-viewport photos and tripped next/image's size check on the hidden
 * twin. So the sharp <Image> is still gated to a single, mounted, theme-correct
 * source (toggling themes swaps the src, loading on demand).
 *
 * But gating the sharp image left the first beat blank — most visible on the
 * playlists list, where a sparse skeleton floats over the bare base colour
 * until mount. So underneath sit two blurred placeholders painted from each
 * photo's inline blurDataURL (a few hundred base64 bytes, no network): CSS
 * (dark:hidden) shows the theme-correct one from the very first paint, so
 * loading always has a soft photo backdrop instead of a flat fill. They cost
 * nothing to download and carry no intrinsic size, so neither the double-fetch
 * nor the size-warning that killed the old approach applies.
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

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <>
      {/* Instant, network-free blurred backdrop; correct theme picked by CSS
          before any JS runs, so the loading beat is never a flat fill. */}
      <BlurLayer img={noon} className="dark:hidden" />
      <BlurLayer img={dusk} className="hidden dark:block" />
      {mounted && (
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
      )}
    </>
  );
}

/** Tiny inline blur (blurDataURL) stretched to cover — the placeholder that
 *  shows while the sharp Image mounts and loads. No-op if next didn't emit a
 *  blur for this import. */
function BlurLayer({
  img,
  className,
}: {
  img: StaticImageData;
  className?: string;
}) {
  if (!img.blurDataURL) return null;
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 bg-center bg-cover", className)}
      style={{ backgroundImage: `url(${img.blurDataURL})` }}
    />
  );
}
