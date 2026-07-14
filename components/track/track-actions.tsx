"use client";

import { X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { AddToPlaylistButton } from "@/components/playlists/add-to-playlist-dialog";
import { LikeButton } from "@/components/playlists/like-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Song } from "@/lib/api/types";

/**
 * The right-side cluster on a track row: like + add-to-playlist everywhere, and
 * a remove button only where removing makes sense (a playlist detail passes
 * onRemove). Siblings of the row's play button — never nested inside it — so
 * the controls stay valid, independently focusable buttons.
 *
 * In the Liked list the heart is dropped (`hideLike`): every row is liked, so
 * the heart would only ever unlike — exactly what the remove (×) already does,
 * and remove carries the undo.
 */
export function TrackActions({
  song,
  onRemove,
  hideLike,
}: {
  song: Song;
  onRemove?: () => void;
  hideLike?: boolean;
}) {
  const t = useTranslations("playlists");
  return (
    <div className="flex shrink-0 items-center">
      {!hideLike && <LikeButton song={song} />}
      <AddToPlaylistButton song={song} />
      {onRemove && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("removeFromPlaylist")}
                className="rounded-full"
                onClick={onRemove}
              >
                <X
                  weight="bold"
                  className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
                  aria-hidden
                />
              </Button>
            }
          />
          <TooltipContent>{t("removeFromPlaylist")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
