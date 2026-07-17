"use client";

import { useTranslations } from "next-intl";
import { useSongCacheState } from "@/lib/cache/audio-cache-status";
import { cn } from "@/lib/utils";

/**
 * Offline-cache indicator in a track row: a thin muted ring = auto-cached (a
 * byproduct of playback, evictable); a solid deep-water dot = a pinned download
 * (not built yet — see lib/cache/audio-cache-status). When a song isn't cached
 * it renders nothing and takes no space, so uncached titles get the full width.
 * Read-only status: no tap target, management lives elsewhere.
 */
export function CacheDot({ songId }: { songId: string }) {
  const state = useSongCacheState(songId);
  const t = useTranslations("cache");

  if (state === "none") return null;

  return (
    <span
      role="img"
      aria-label={state === "active" ? t("downloaded") : t("auto")}
      className={cn(
        "shrink-0 rounded-full",
        state === "auto"
          ? "size-[0.6rem] border-[1.6px] border-muted-foreground"
          : "size-[0.52rem] bg-turquoise-deep dark:bg-turquoise",
      )}
    />
  );
}
