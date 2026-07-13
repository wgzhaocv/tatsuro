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
import { MAX_NAME } from "./name-dialog";
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
  const [name, setName] = useState("");

  // Same rules as PlaylistNameDialog so the two create paths can't disagree.
  const trimmed = name.trim();
  const duplicate = playlists.some(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !duplicate;

  function create() {
    if (!canCreate) return;
    addSong(createPlaylist(trimmed), song);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-1">
      {playlists.length > 0 && (
        <ul className="-mx-2 max-h-[46vh] overflow-y-auto">
          {playlists.map((p) => {
            const member = p.entries.some((e) => e.song.id === song.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={member}
                  onClick={() =>
                    member ? removeSong(p.id, song.id) : addSong(p.id, song)
                  }
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none transition-colors duration-300 ease-lazy hover:bg-navy/[0.05] focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/[0.06]"
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
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex items-center gap-2 pt-1"
        >
          <Input
            autoFocus
            value={name}
            maxLength={MAX_NAME}
            aria-invalid={duplicate || undefined}
            placeholder={t("namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={!canCreate}>
            {t("create")}
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCreating(true)}
          className="mt-1 h-11 justify-start gap-2 rounded-xl px-2 text-[15px] text-foreground"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Plus
              weight="bold"
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          </span>
          {t("newPlaylist")}
        </Button>
      )}
    </div>
  );
}
