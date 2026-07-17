"use client";

import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { usePlaylistStore } from "@/lib/playlists/store";
import type { Playlist } from "@/lib/playlists/types";
import { PlaylistNameDialog } from "./name-dialog";

/**
 * User-playlist header actions beside Play all — rename + delete, pulled out of
 * the old ⋯ menu into two glass icon buttons so they sit in the open next to
 * the offline switch. Over the hero photo, so they're frosted glass. Delete
 * confirms first, then tombstones the list and returns to the index.
 */
export function PlaylistHeaderActions({ playlist }: { playlist: Playlist }) {
  const t = useTranslations("playlists");
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="glass"
        size="icon"
        className="size-11 rounded-full"
        aria-label={t("rename")}
        title={t("rename")}
        onClick={() => setRenaming(true)}
      >
        <PencilSimple weight="bold" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="glass"
        size="icon"
        className="size-11 rounded-full"
        aria-label={t("delete")}
        title={t("delete")}
        onClick={() => setDeleting(true)}
      >
        <Trash weight="bold" aria-hidden />
      </Button>

      <PlaylistNameDialog
        open={renaming}
        onOpenChange={setRenaming}
        mode="rename"
        initialName={playlist.name}
        excludeId={playlist.id}
        onSubmit={(name) => renamePlaylist(playlist.id, name)}
      />

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteBody", { name: playlist.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                deletePlaylist(playlist.id);
                router.replace("/playlists");
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
