"use client";

import { Check, Plus } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Song } from "@/lib/api/types";
import { usePlaylistStore, useVisiblePlaylists } from "@/lib/playlists/store";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import { MAX_NAME, submittedPlaylistName } from "./name-dialog";
import { PlaylistCover } from "./playlist-cover";

/**
 * Add/remove a song across playlists. The trigger is a plus button (row +
 * player). Each user playlist is a toggle row — a check when the song is in it,
 * click to add or remove (this is also how you remove membership, matching the
 * old flow, but the playlist detail additionally has a per-row remove). Liked
 * is left out here: the heart owns it. An inline "New playlist" field creates
 * one and drops the song straight in.
 */
export function AddToPlaylistButton({
  song,
  className,
}: {
  song: Song;
  className?: string;
}) {
  const t = useTranslations("playlists");
  const [open, setOpen] = useState(false);
  const label = t("addToPlaylist");

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        className={cn("rounded-full", className)}
        onClick={() => setOpen(true)}
      >
        <Plus
          weight="bold"
          className="size-[18px] text-muted-foreground group-hover/button:text-foreground"
          aria-hidden
        />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <AddToPlaylistBody song={song} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddToPlaylistBody({ song }: { song: Song }) {
  const t = useTranslations("playlists");
  const playlists = useVisiblePlaylists().filter((p) => p.kind === "user");
  const addSong = usePlaylistStore((s) => s.addSong);
  const removeSong = usePlaylistStore((s) => s.removeSong);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);

  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {playlists.length > 0 && (
        <ul className="-mx-2 max-h-[46vh] overflow-y-auto">
          {playlists.map((p) => {
            const member = p.entries.some((e) => e.song.id === song.id);
            return (
              <li key={p.id}>
                <Button
                  type="button"
                  variant="row"
                  size="row"
                  className="w-full"
                  aria-pressed={member}
                  onClick={() =>
                    member ? removeSong(p.id, song.id) : addSong(p.id, song)
                  }
                >
                  <PlaylistCover
                    playlist={p}
                    className="size-10 shrink-0 rounded-lg"
                    sizes="40px"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      lang={isJapanese(p.name) ? "ja" : undefined}
                      className="block truncate text-[15px] text-foreground"
                    >
                      {p.name}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {t("songCount", { n: p.entries.length })}
                    </span>
                  </span>
                  {member && (
                    <Check
                      weight="bold"
                      className="size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Same rules as PlaylistNameDialog so the two create paths can't disagree.
            const name = submittedPlaylistName(
              e.currentTarget,
              playlists,
              t("nameTaken"),
            );
            if (name === null) return;
            addSong(createPlaylist(name), song);
            setCreating(false);
          }}
          className="flex items-center gap-2 pt-1"
        >
          <Input
            name="name"
            autoFocus
            required
            maxLength={MAX_NAME}
            placeholder={t("namePlaceholder")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />
          <Button type="submit" variant="cta">
            {t("create")}
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="row"
          size="row"
          onClick={() => setCreating(true)}
          className="-mx-2 mt-1 w-full"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Plus
              weight="bold"
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          </span>
          <span className="text-[15px] text-foreground">
            {t("newPlaylist")}
          </span>
        </Button>
      )}
    </div>
  );
}
