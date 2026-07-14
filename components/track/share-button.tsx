"use client";

import { ShareNetwork } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Song } from "@/lib/api/types";
import { getSongShareLink } from "@/lib/share";
import { cn } from "@/lib/utils";

/**
 * Copy / native-share a deep link to a song: the release page with `?song=` (the
 * album screen highlights the track, old-site style) + a minted auth token so the
 * recipient and link-preview bots open straight in. Returned as a hook so the
 * standalone button and the track-row overflow menu share one implementation.
 */
export function useShareSong(song: Song): () => Promise<void> {
  const t = useTranslations("share");
  const locale = useLocale();
  return useCallback(async () => {
    try {
      const link = song.albumId
        ? await getSongShareLink(song.albumId, song.id, locale)
        : null;
      if (!link) {
        toast.error(t("failed"));
        return;
      }
      const url = `${window.location.origin}/${locale}${link}`;
      // Native share sheet on touch devices; clipboard on desktop.
      if (
        typeof navigator.share === "function" &&
        navigator.maxTouchPoints > 0
      ) {
        await navigator.share({ title: song.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("copied"));
      }
    } catch (err) {
      // User dismissed the native share sheet — not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("failed"));
    }
  }, [song.albumId, song.id, song.name, locale, t]);
}

/** Standalone icon button — the roomy surfaces (full player). */
export function ShareButton({
  song,
  className,
}: {
  song: Song;
  className?: string;
}) {
  const t = useTranslations("share");
  const share = useShareSong(song);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("song")}
            className={cn("rounded-full", className)}
            onClick={share}
          >
            <ShareNetwork
              className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
              aria-hidden
            />
          </Button>
        }
      />
      <TooltipContent>{t("song")}</TooltipContent>
    </Tooltip>
  );
}
