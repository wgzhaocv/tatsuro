"use client";

import {
  CircleNotch,
  DotsThreeVertical,
  Plus,
  Queue,
  ShareNetwork,
  VinylRecord,
  X,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/navigation";
import type { Song } from "@/lib/api/types";
import { jumpToSong } from "@/lib/player/highlight";
import { usePlayerStore } from "@/lib/player/store";
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
  const tp = useTranslations("player");
  const locale = useLocale();
  const router = useRouter();
  const playNext = usePlayerStore((s) => s.playNext);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { share, pending: sharePending } = useShareSong(song);

  // Keep the menu open while the share link mints (spinner shows inline on the
  // row); close it on success, leave it open on failure so the miss is visible.
  const onShare = async () => {
    if (await share()) setMenuOpen(false);
  };

  const queueNext = () => {
    const { current } = usePlayerStore.getState();
    if (current?.id === song.id) return; // already the current track — no-op
    playNext(song);
    // With something already playing this queues behind it; with nothing
    // playing it just starts, and the appearing player is its own feedback.
    if (current) toast.success(tp("queuedNext"));
  };

  const viewAlbum = async () => {
    if (!song.albumId) return;
    const href = await getAlbumHref(song.albumId, locale);
    if (href) jumpToSong(router, href, song.id);
  };

  return (
    <div className="flex shrink-0 items-center">
      {!hideLike && <LikeButton song={song} />}

      <Menu open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
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
            }
          />
          <TooltipContent>{t("moreActions")}</TooltipContent>
        </Tooltip>
        <MenuContent>
          <MenuItem onClick={queueNext}>
            <Queue weight="bold" aria-hidden />
            {tp("playNext")}
          </MenuItem>
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
          <MenuItem
            closeOnClick={false}
            disabled={sharePending}
            onClick={onShare}
          >
            {sharePending ? (
              <CircleNotch className="animate-spin" aria-hidden />
            ) : (
              <ShareNetwork aria-hidden />
            )}
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
