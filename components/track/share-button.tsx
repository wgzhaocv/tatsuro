"use client";

import { CircleNotch, ShareNetwork } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { useShareLink } from "@/components/share/use-share";
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
export function useShareSong(song: Song): {
  share: () => Promise<boolean>;
  pending: boolean;
} {
  const { share, pending } = useShareLink();
  const locale = useLocale();
  const shareSong = useCallback(
    () =>
      share(
        () =>
          song.albumId
            ? getSongShareLink(song.albumId, song.id, locale)
            : Promise.resolve(null),
        song.name,
      ),
    [share, locale, song.albumId, song.id, song.name],
  );
  return { share: shareSong, pending };
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
  const { share, pending } = useShareSong(song);
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
            disabled={pending}
          >
            {pending ? (
              <CircleNotch
                className="size-[18px] animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : (
              <ShareNetwork
                className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
                aria-hidden
              />
            )}
          </Button>
        }
      />
      <TooltipContent>{t("song")}</TooltipContent>
    </Tooltip>
  );
}
