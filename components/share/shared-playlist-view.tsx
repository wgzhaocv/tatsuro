"use client";

import { BookmarkSimple, House } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlbumAmbient } from "@/components/album/album-ambient";
import { GlassPanel } from "@/components/glass-panel";
import { PlaylistCover } from "@/components/playlists/playlist-cover";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useRouter } from "@/i18n/navigation";
import type { Song } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import { durationLabel } from "@/lib/format";
import { useHasHydrated, usePlaylistStore } from "@/lib/playlists/store";
import type { Playlist, PlaylistKind } from "@/lib/playlists/types";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Someone else's playlist, as a decision rather than a place to listen: cover,
 * name, who sent it, and the tracks it holds — with saving a copy as the only
 * action. No playback, no likes, no per-row menu; a visitor who wants to hear it
 * saves it first and listens on their own copy, which is why saving navigates
 * there. (This is a product decision, not a restriction it could enforce: the
 * songs are in the page payload either way.)
 *
 * Saving needs no account — playlists are local-first — and a connected
 * visitor's store subscription uploads the copy on its own.
 *
 * A lean sibling of PlaylistDetail rather than a variant of it: that component
 * is welded to the local store and to the queue (missing-id redirect,
 * add/remove, rename, offline switch, TrackRow-as-play-control), so the two
 * screens now overlap in layout only.
 */
export function SharedPlaylistView({
  slug,
  kind,
  title,
  owner,
  coverId,
  songs,
}: {
  slug: string;
  /** Only the title's script gate reads this — see the `lang` attribute below. */
  kind: PlaylistKind;
  /** Already localized upstream (Liked becomes "{owner}'s liked songs"). */
  title: string;
  /** Owner display name, already fallen back to the unknown-owner string. */
  owner: string;
  coverId?: string;
  songs: Song[];
}) {
  const t = useTranslations("share");
  const tp = useTranslations("playlists");
  const tRoot = useTranslations();
  const router = useRouter();
  const hydrated = useHasHydrated();
  const createPlaylistWithSongs = usePlaylistStore(
    (s) => s.createPlaylistWithSongs,
  );

  // Explicit cover, else the first song carrying one — PlaylistCover's own rule,
  // resolved here because the ambient wash behind the page needs the same id.
  const ambientCoverId =
    coverId ?? songs.find((s) => s.coverFrontId)?.coverFrontId;

  // A display-only Playlist so PlaylistCover works unchanged — never stored, so
  // only the two fields it reads carry meaning: kind "user" makes a shared Liked
  // list show its songs' covers rather than the owner's heart tile, and passing
  // the resolved coverId short-circuits its own derivation (handing it `entries`
  // instead would re-derive the same id down a second path, free to drift from
  // the wash above).
  const asPlaylist: Playlist = {
    id: slug,
    kind: "user",
    name: title,
    entries: [],
    coverId: ambientCoverId,
    createdAt: 0,
    updatedAt: 0,
  };
  const seconds = songs.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const meta = [
    tp("songCount", { n: songs.length }),
    durationLabel(tRoot, seconds),
  ]
    .filter(Boolean)
    .join(" · ");

  // Local-first, so no login needed: a copy is a plain new playlist of this
  // list's songs, editable like any other. A connected visitor's store
  // subscription uploads it on its own. Copying twice makes two copies —
  // the same semantics as importing a starter mix.
  //
  // Then go straight to the copy rather than offering it in the toast: this page
  // can't play anything, so the visitor's next move is always to open the list
  // they just made. The toast follows them there as confirmation.
  const saveCopy = () => {
    const id = createPlaylistWithSongs(title, songs);
    router.push(`/playlists/${id}`);
    toast.success(t("savedCopy"));
  };

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      {/* Sits in this z-10 stacking context, so the fixed -z-10 wash paints
          over the section's beach hero (z-0) yet under the chrome below. */}
      {ambientCoverId && <AlbumAmbient cover={coverUrl(ambientCoverId)} />}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* Home, not back: a shared link is usually the visitor's first page
            here, so there's nothing behind it in their history. */}
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "glass" }),
            "h-11 rounded-full pr-4 pl-3",
          )}
        >
          <House size={18} weight="bold" aria-hidden />
          {t("goHome")}
        </Link>
        <ThemeToggle />
      </header>

      {/* A shared link walks its recipient straight past the gate, so they may
          not know whose list this is, that it isn't theirs, or that they can
          keep it. This says all three, and — since the page itself doesn't
          play — where listening happens: save it, and you land on your own
          copy. */}
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <GlassPanel className="rounded-[22px] px-5 py-5 shadow-postcard sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="font-display text-base font-medium text-foreground sm:text-lg">
                {t("arrivalTitle", { name: owner })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("arrivalBody")}
              </p>
            </div>
            <Button
              type="button"
              variant="cta"
              // The store rehydrates after mount; copying before that would
              // write into an empty library and lose it on rehydrate.
              disabled={!hydrated || songs.length === 0}
              className="h-11 shrink-0 rounded-full pr-5 pl-4"
              onClick={saveCopy}
            >
              <BookmarkSimple weight="bold" aria-hidden />
              {t("saveCopy")}
            </Button>
          </div>
        </GlassPanel>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pt-2 pb-20 sm:px-8 lg:grid lg:grid-cols-[18.5rem_1fr] lg:items-start lg:gap-12 lg:pt-6">
        <aside className="grid grid-cols-[8rem_1fr] items-center gap-x-5 sm:grid-cols-[14rem_1fr] sm:gap-x-7 lg:sticky lg:top-8 lg:flex lg:flex-col lg:items-start">
          <PlaylistCover
            playlist={asPlaylist}
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 224px, 296px"
            className="aspect-square w-full rounded-[14px] shadow-postcard sm:rounded-[20px]"
          />

          <div className="flex min-w-0 flex-col items-start">
            <h1
              // A Liked title is dictionary chrome, not content: it carries the
              // owner's name in the visitor's language, so a Japanese name (or
              // any CJK, which is all isJapanese can tell) would otherwise put
              // the whole zh/en heading on the Japanese font stack.
              lang={kind === "user" && isJapanese(title) ? "ja" : undefined}
              className={cn(
                "font-display text-2xl font-semibold leading-[1.15] sm:text-[2.375rem] sm:leading-[1.12] lg:mt-6",
                ambientCoverId
                  ? "text-foreground"
                  : "text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)]",
              )}
            >
              {title}
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
            {/* No actions here: attribution and the one thing to do (save)
                  both live in the arrival panel above. */}
          </div>
        </aside>

        {songs.length === 0 ? (
          <GlassPanel className="mt-10 rounded-[28px] px-6 py-16 text-center shadow-postcard lg:mt-0">
            <p className="font-display text-lg font-medium text-foreground">
              {tp("emptyDetail")}
            </p>
          </GlassPanel>
        ) : (
          <GlassPanel
            as="main"
            className="mt-10 rounded-[28px] px-3 py-6 shadow-postcard sm:px-6 lg:mt-0"
          >
            <ol>
              {songs.map((song, i) => (
                <TrackLine key={song.id} song={song} number={i + 1} />
              ))}
            </ol>

            <p className="mt-8 border-t border-border/70 px-3 pt-5 text-[13px] text-muted-foreground">
              {meta}
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}

/**
 * One line of the shared tracklist: number · title, and nothing to press.
 * Deliberately not TrackRow — that row *is* a play control (it reads the queue
 * context and the player store, and carries the like/add/remove cluster), so a
 * read-only variant would mean threading an inert flag through a component two
 * other screens depend on. Here the list is a list: the only action on this
 * page is saving.
 */
function TrackLine({ song, number }: { song: Song; number: number }) {
  return (
    <li className="flex min-h-11 items-center gap-4 py-2 pr-1 pl-3">
      <span className="w-6 shrink-0 text-[13px] text-muted-foreground tabular-nums">
        {number}
      </span>
      <span
        lang={isJapanese(song.name) ? "ja" : undefined}
        title={song.name}
        className="truncate text-[15px] text-foreground"
      >
        {song.name}
      </span>
    </li>
  );
}
