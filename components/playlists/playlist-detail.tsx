"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { AlbumAmbient } from "@/components/album/album-ambient";
import { SharedSongHighlight } from "@/components/album/shared-song-highlight";
import { GlassPanel } from "@/components/glass-panel";
import { OfflineSwitch } from "@/components/offline/offline-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  PlayQueueButton,
  QueuePlaybackProvider,
} from "@/components/track/playback-context";
import { TrackRow } from "@/components/track/track-row";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useRouter } from "@/i18n/navigation";
import { coverUrl } from "@/lib/api/urls";
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
 * One playlist over its cover's ambient wash (album-style; the section's beach
 * hero shows through only when no song has a cover yet): a back bar, an
 * identity block (cover + name + count/duration + Play all + the ⋯ menu), and
 * the frosted tracklist sheet. Client-rendered off the persisted store; a
 * missing id (bad link, or a just-deleted list) bounces back to the index once
 * hydrated.
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
  // Artwork-lit background, mirroring the album detail: the playlist's cover
  // (explicit, else the first song that carries one — same rule as
  // PlaylistCover) blurred huge under a noon/dusk dissolve. When nothing has a
  // cover yet (fresh/empty list) we fall through to the section's beach hero.
  const ambientCoverId =
    playlist?.coverId ??
    playlist?.entries.find((e) => e.song.coverFrontId)?.song.coverFrontId;
  const seconds = songs.reduce((s, x) => s + (x.duration ?? 0), 0);
  const meta = [
    t("songCount", { n: songs.length }),
    durationLabel(tRoot, seconds),
  ]
    .filter(Boolean)
    .join(" · ");

  // Loading (store not yet rehydrated) or about to redirect (no such playlist):
  // show one skeleton for the whole load so nothing flashes blank. The same
  // component backs the route's Suspense fallback (page.tsx), so the server-
  // streamed hole and the client hydration phase render identically.
  if (!hydrated || !playlist) return <PlaylistDetailSkeleton />;

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      {/* Sits in this z-10 stacking context, so the fixed -z-10 wash paints
          over the section's beach hero (z-0) yet under the chrome below. */}
      {ambientCoverId && <AlbumAmbient cover={coverUrl(ambientCoverId)} />}
      {/* Flash the track a "go to source" jump (from the player) points at. */}
      <SharedSongHighlight />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
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

      <QueuePlaybackProvider
        songs={songs}
        label={name}
        queueId={playlist.id}
        href={`/playlists/${playlist.id}`}
      >
        <div className="mx-auto w-full max-w-6xl px-5 pt-2 pb-20 sm:px-8 lg:grid lg:grid-cols-[18.5rem_1fr] lg:items-start lg:gap-12 lg:pt-6">
          {/* Identity rail — same structure as the album detail:
                cover-beside-identity on phones/tablets, a sticky column on
                desktop so long lists keep the cover in view. Text is ink over
                the cover wash (album-style); white only in the beach-hero
                fallback when no song carries a cover yet. */}
          <aside className="grid grid-cols-[8rem_1fr] items-center gap-x-5 sm:grid-cols-[14rem_1fr] sm:gap-x-7 lg:sticky lg:top-8 lg:flex lg:flex-col lg:items-start">
            <PlaylistCover
              playlist={playlist}
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 224px, 296px"
              className="aspect-square w-full rounded-[14px] shadow-postcard sm:rounded-[20px]"
            />

            <div className="flex min-w-0 flex-col items-start">
              <h1
                lang={!isLiked && isJapanese(name) ? "ja" : undefined}
                className={cn(
                  "font-display text-2xl font-semibold leading-[1.15] sm:text-[2.375rem] sm:leading-[1.12] lg:mt-6",
                  ambientCoverId
                    ? "text-foreground"
                    : "text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)]",
                )}
              >
                {name}
              </h1>
              <p
                className={cn(
                  "mt-2 text-sm",
                  ambientCoverId
                    ? "text-foreground/85"
                    : "text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]",
                )}
              >
                {meta}
              </p>
              <div className="mt-5 flex flex-col items-start gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center">
                <PlayQueueButton
                  playText={t("playAll")}
                  pauseText={tRoot("album.pause")}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <OfflineSwitch
                    contextId={playlist.id}
                    kind="playlist"
                    label={playlist.name}
                  />
                  {!isLiked && <PlaylistHeaderActions playlist={playlist} />}
                </div>
              </div>
            </div>
          </aside>

          {songs.length === 0 ? (
            <GlassPanel className="mt-10 rounded-[28px] px-6 py-16 text-center shadow-postcard lg:mt-0">
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
              className="mt-10 rounded-[28px] px-3 py-6 shadow-postcard sm:px-6 lg:mt-0"
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

              <p className="mt-8 border-t border-border/70 px-3 pt-5 text-[13px] text-muted-foreground">
                {meta}
              </p>
            </GlassPanel>
          )}
        </div>
      </QueuePlaybackProvider>
    </div>
  );
}

/**
 * Full-page placeholder for the playlist detail — header chrome + identity rail +
 * track rows. Used both as the route's Suspense fallback (page.tsx, while the
 * dynamic params hole streams) and as PlaylistDetail's own loading state (while
 * the local store rehydrates), so the whole load shows one steady skeleton with
 * no blank flash. White-tint blocks read over the section's beach hero; the
 * global reduced-motion switch stills the pulse.
 */
export function PlaylistDetailSkeleton() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <div className="h-11 w-32 animate-pulse rounded-full bg-white/20" />
        <div className="size-11 animate-pulse rounded-full bg-white/20" />
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pt-2 pb-20 sm:px-8 lg:grid lg:grid-cols-[18.5rem_1fr] lg:items-start lg:gap-12 lg:pt-6">
        <aside className="grid grid-cols-[8rem_1fr] items-center gap-x-5 sm:grid-cols-[14rem_1fr] sm:gap-x-7 lg:flex lg:flex-col lg:items-start">
          <div className="aspect-square w-full animate-pulse rounded-[14px] bg-white/20 shadow-postcard sm:rounded-[20px]" />
          <div className="flex min-w-0 flex-col items-start gap-3 lg:mt-6 lg:w-full">
            <div className="h-8 w-40 animate-pulse rounded-md bg-white/20 sm:h-10 sm:w-56" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/20" />
            <div className="mt-2 h-11 w-32 animate-pulse rounded-full bg-white/20" />
          </div>
        </aside>
        <ol className="mt-8 flex flex-col gap-1 lg:mt-0">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <li key={k} className="flex items-center gap-3 px-3 py-2">
              <div className="size-11 shrink-0 animate-pulse rounded-md bg-white/20" />
              <div className="flex min-w-0 grow flex-col gap-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/20" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/20" />
              </div>
              <div className="h-3 w-10 animate-pulse rounded bg-white/20" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
