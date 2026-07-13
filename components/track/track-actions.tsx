"use client";

import { X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { AddToPlaylistButton } from "@/components/playlists/add-to-playlist-dialog";
import { LikeButton } from "@/components/playlists/like-button";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/api/types";

/**
 * The right-side cluster on a track row: like + add-to-playlist everywhere, and
 * a remove button only where removing makes sense (a playlist detail passes
 * onRemove). Siblings of the row's play button — never nested inside it — so
 * the controls stay valid, independently focusable buttons.
 */
export function TrackActions({
  song,
  onRemove,
}: {
  song: Song;
  onRemove?: () => void;
}) {
  const t = useTranslations("playlists");
  return (
    <div className="flex shrink-0 items-center">
      <LikeButton song={song} />
      <AddToPlaylistButton song={song} />
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("removeFromPlaylist")}
          title={t("removeFromPlaylist")}
          className="rounded-full"
          onClick={onRemove}
        >
          <X
            weight="bold"
            className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
            aria-hidden
          />
        </Button>
      )}
    </div>
  );
}
