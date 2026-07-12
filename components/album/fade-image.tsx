"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A cover image that fades in once decoded, so covers dissolve in instead of
 * popping — the one client-side leaf of the album screen. Reduced-motion users
 * get the global transition kill-switch (globals.css).
 */
export function FadeImage({
  src,
  sizes,
  priority,
  className,
}: {
  src: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-cover transition-opacity duration-700 ease-lazy",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
