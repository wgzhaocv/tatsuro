"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useSongCacheState } from "@/lib/cache/audio-cache-status";
import { useSongDownloadActivity } from "@/lib/downloads/reconciler";
import { cn } from "@/lib/utils";

/**
 * Offline-cache indicator in a track row. A thin muted ring = auto-cached (a
 * byproduct of playback, evictable); a solid deep-water dot = a pinned download.
 * While the reconciler is actively fetching this song it shows a small spinner
 * (a transition, not a fourth resting state). When a song isn't cached and
 * isn't downloading it renders nothing and takes no space, so uncached titles
 * get the full width. Read-only status: no tap target, management lives
 * elsewhere.
 */
export function CacheDot({ songId }: { songId: string }) {
  const state = useSongCacheState(songId);
  const downloading = useSongDownloadActivity(songId);
  const t = useTranslations("cache");

  // Fetching now (and not yet in a bucket): transitional spinner.
  if (downloading && state === "none") {
    return (
      <CircleNotch
        size={12}
        weight="bold"
        aria-label={t("downloading")}
        className="shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
      />
    );
  }

  if (state === "none") return null;

  return (
    <span
      role="img"
      aria-label={state === "active" ? t("downloaded") : t("auto")}
      className={cn("shrink-0 rounded-full", cacheDotClass(state))}
    />
  );
}

/** Geometry + colour of the two resting offline marks — a thin muted ring
 *  (auto, evictable) / a solid deep-water dot (pinned download). Shared so the
 *  More-page legend renders the exact same marks the track rows do. */
export function cacheDotClass(state: "auto" | "active"): string {
  return state === "auto"
    ? "size-[0.6rem] border-[1.6px] border-muted-foreground"
    : "size-[0.52rem] bg-turquoise-deep dark:bg-turquoise";
}
