"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/glass-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  PlayQueueButton,
  QueuePlaybackProvider,
} from "@/components/track/playback-context";
import { TrackRow } from "@/components/track/track-row";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useRouter } from "@/i18n/navigation";
import { durationLabel } from "@/lib/format";
import {
  useHasHydrated,
  usePlaylist,
  usePlaylistStore,
} from "@/lib/playlists/store";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import { PlaylistCover } from "./playlist-cover";
import { PlaylistHeaderActions } from "./playlist-header-actions";

/**
 * One playlist over the section's beach hero: a back bar, an identity block
 * (cover + name + count/duration + Play all + the ⋯ menu), and the frosted
 * tracklist sheet. Client-rendered off the persisted store; a missing id (bad
 * link, or a just-deleted list) bounces back to the index once hydrated.
 */
export function PlaylistDetail({ id }: { id: string }) {
  const t = useTranslations("playlists");
  const tRoot = useTranslations();
  const hydrated = useHasHydrated();
  const playlist = usePlaylist(id);
  const removeSong = usePlaylistStore((s) => s.removeSong);
  const restoreSong = usePlaylistStore((s) => s.restoreSong);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !playlist) router.replace("/playlists");
  }, [hydrated, playlist, router]);

  const isLiked = playlist?.kind === "liked";
  const name = playlist ? (isLiked ? t("likedSongs") : playlist.name) : "";
  const songs = useMemo(
    () => playlist?.entries.map((e) => e.song) ?? [],
    [playlist],
  );
  const seconds = songs.reduce((s, x) => s + (x.duration ?? 0), 0);
  const meta = [
    t("songCount", { n: songs.length }),
    durationLabel(tRoot, seconds),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <Link
          href="/playlists"
          className={cn(
            buttonVariants({ variant: "glass" }),
            "h-11 rounded-full pr-4 pl-3",
          )}
        >
          <ArrowLeft size={18} weight="bold" aria-hidden />
          {t("heading")}
        </Link>
        <ThemeToggle />
      </header>

      {hydrated && playlist && (
        <QueuePlaybackProvider songs={songs} label={name} queueId={playlist.id}>
          <div className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
            {/* Compact cover-beside-identity, mirroring the album detail: a
                small cover left of left-aligned title, meta, and Play all. */}
            <div className="flex items-center gap-4 py-2 sm:gap-6">
              <PlaylistCover
                playlist={playlist}
                sizes="(max-width: 639px) 112px, 192px"
                className="size-28 shrink-0 rounded-[14px] shadow-postcard sm:size-48 sm:rounded-[18px]"
              />
              <div className="flex min-w-0 flex-col items-start">
                <h1
                  lang={!isLiked && isJapanese(name) ? "ja" : undefined}
                  className="font-display text-2xl font-semibold leading-[1.15] text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-[2.375rem] sm:leading-[1.12]"
                >
                  {name}
                </h1>
                <p className="mt-2 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]">
                  {meta}
                </p>
                <div className="mt-4 flex items-center gap-2.5 sm:mt-6">
                  <PlayQueueButton
                    playText={t("playAll")}
                    pauseText={tRoot("album.pause")}
                  />
                  {!isLiked && <PlaylistHeaderActions playlist={playlist} />}
                </div>
              </div>
            </div>

            {songs.length === 0 ? (
              <GlassPanel className="mt-8 rounded-[28px] px-6 py-16 text-center shadow-postcard">
                <p className="font-display text-lg font-medium text-foreground">
                  {t("emptyDetail")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLiked ? t("emptyLikedBody") : t("emptyDetailBody")}
                </p>
              </GlassPanel>
            ) : (
              <GlassPanel
                as="main"
                className="mt-8 rounded-[28px] px-2 py-4 shadow-postcard sm:px-4"
              >
                <ol>
                  {songs.map((song, i) => (
                    <TrackRow
                      key={song.id}
                      track={song}
                      index={i}
                      queueIndex={i}
                      hideLike={isLiked}
                      showAlbumLink
                      onRemove={(s) => {
                        // Remove immediately (low-stakes, reversible) but offer
                        // an undo that puts the entry back where it was.
                        const entry = playlist.entries[i];
                        removeSong(playlist.id, s.id);
                        toast(t("removedFromPlaylist"), {
                          // A touch longer than the default so there's a real
                          // window to hit undo.
                          duration: 6000,
                          action: {
                            label: t("undo"),
                            onClick: () => restoreSong(playlist.id, entry, i),
                          },
                        });
                      }}
                    />
                  ))}
                </ol>
              </GlassPanel>
            )}
          </div>
        </QueuePlaybackProvider>
      )}
    </div>
  );
}
