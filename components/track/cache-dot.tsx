"use client";

import { useTranslations } from "next-intl";
import { useSongCacheState } from "@/lib/cache/audio-cache-status";
import { cn } from "@/lib/utils";

/**
 * Offline-cache indicator, in a track row's fixed status slot between the title
 * and the duration. A thin muted ring = auto-cached (a byproduct of playback,
 * evictable); a solid deep-water dot = a pinned download (not built yet — see
 * lib/cache/audio-cache-status). The slot keeps its width even when empty so
 * the duration column stays aligned down the list. Read-only status: there's
 * no tap target here, management lives elsewhere.
 */
export function CacheDot({ songId }: { songId: string }) {
  const state = useSongCacheState(songId);
  const t = useTranslations("cache");

  return (
    <span className="grid w-5 shrink-0 place-items-center">
      {state === "none" ? null : (
        <span
          role="img"
          aria-label={state === "active" ? t("downloaded") : t("auto")}
          className={cn(
            "rounded-full",
            state === "auto"
              ? "size-[0.6rem] border-[1.6px] border-muted-foreground"
              : "size-[0.52rem] bg-turquoise-deep dark:bg-turquoise",
          )}
        />
      )}
    </span>
  );
}
