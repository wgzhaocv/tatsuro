"use client";

import { getImageProps, type StaticImageData } from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Companion to ThemeImage. ThemeImage's sharp <picture> follows the OS
 * (prefers-color-scheme) so it can be server-rendered as the prioritised LCP
 * paint — but that means the in-app theme toggle can't move it. This tiny
 * client layer closes that gap: once mounted, it compares resolvedTheme to the
 * OS scheme and, ONLY when the viewer has actively overridden the OS, paints
 * the theme-correct photo on top of the <picture>.
 *
 * Cost is scoped to the override case: the common path (app theme == OS, incl.
 * defaultTheme="system" on first load) renders nothing and downloads no extra
 * image, so the LCP path is untouched. A viewer who toggles against their OS
 * downloads the other photo — the one thing they explicitly asked to see.
 */
export function ThemeImageOverride({
  noon,
  dusk,
  sizes,
  className,
}: {
  noon: StaticImageData;
  dusk: StaticImageData;
  sizes: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [osDark, setOsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setOsDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Not yet measured, or theme unresolved: leave the <picture> as-is.
  if (osDark === null || !resolvedTheme) return null;

  const wantDark = resolvedTheme === "dark";
  // OS already matches the toggle → the <picture> is correct, add nothing.
  if (wantDark === osDark) return null;

  const { props } = getImageProps({
    alt: "",
    sizes,
    src: wantDark ? dusk : noon,
  });

  return (
    // Rendered after the <picture> in DOM order, so this absolutely-positioned
    // layer stacks on top and wins. className keeps the same dark: crop variant;
    // the .dark class is present exactly when wantDark, so it resolves right.
    // Wrapped in <picture> to mirror ThemeImage (and satisfy noImgElement).
    <picture>
      <img
        {...props}
        alt=""
        loading="eager"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    </picture>
  );
}
