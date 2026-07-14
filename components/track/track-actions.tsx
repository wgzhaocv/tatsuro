"use client";

import {
  DotsThreeVertical,
  Plus,
  ShareNetwork,
  VinylRecord,
  X,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AddToPlaylistBody } from "@/components/playlists/add-to-playlist-dialog";
import { LikeButton } from "@/components/playlists/like-button";
import { useShareSong } from "@/components/track/share-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { useRouter } from "@/i18n/navigation";
import type { Song } from "@/lib/api/types";
import { getAlbumHref } from "@/lib/share";

/**
 * The right-side cluster on a track row: the like heart stays inline (the one
 * quick, one-tap action, and it shows liked state at a glance), and everything
 * else — add to playlist, share, view album, and remove where it applies —
 * collapses into a single ⋯ overflow menu so the row stays uncluttered on a
 * phone. Siblings of the row's play button, never nested, so all controls stay
 * independently focusable.
 *
 * In the Liked list the heart is dropped (`hideLike`): every row is liked, so it
 * would only ever unlike — which the menu's remove already does, with undo.
 * `showAlbumLink` adds "view album" (playlist / Liked rows, where you may want to
 * jump to the source release; album rows are already on it).
 */
export function TrackActions({
  song,
  onRemove,
  hideLike,
  showAlbumLink,
}: {
  song: Song;
  onRemove?: () => void;
  hideLike?: boolean;
  showAlbumLink?: boolean;
}) {
  const t = useTranslations("playlists");
  const ts = useTranslations("share");
  const tg = useTranslations("song");
  const locale = useLocale();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const share = useShareSong(song);

  const viewAlbum = async () => {
    if (!song.albumId) return;
    const href = await getAlbumHref(song.albumId, locale);
    if (href) router.push(href);
  };

  return (
    <div className="flex shrink-0 items-center">
      {!hideLike && <LikeButton song={song} />}

      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("moreActions")}
              className="rounded-full"
            />
          }
        >
          <DotsThreeVertical
            weight="bold"
            className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
            aria-hidden
          />
        </MenuTrigger>
        <MenuContent>
          <MenuItem onClick={() => setAddOpen(true)}>
            <Plus weight="bold" aria-hidden />
            {t("addToPlaylist")}
          </MenuItem>
          {showAlbumLink && song.albumId && (
            <MenuItem onClick={viewAlbum}>
              <VinylRecord weight="bold" aria-hidden />
              {tg("openAlbum")}
            </MenuItem>
          )}
          <MenuItem onClick={share}>
            <ShareNetwork aria-hidden />
            {ts("song")}
          </MenuItem>
          {onRemove && (
            <MenuItem variant="destructive" onClick={onRemove}>
              <X weight="bold" aria-hidden />
              {t("removeFromPlaylist")}
            </MenuItem>
          )}
        </MenuContent>
      </Menu>

      {/* Opened from the menu; lives here so the menu can close first. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="gap-4">
          <DialogHeader>
            <DialogTitle>{t("addToPlaylist")}</DialogTitle>
          </DialogHeader>
          <AddToPlaylistBody song={song} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
