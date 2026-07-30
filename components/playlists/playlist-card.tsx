"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import type { Playlist } from "@/lib/playlists/types";
import { isJapanese } from "@/lib/text";
import { PlaylistCover } from "./playlist-cover";

/**
 * A playlist link that changes shape with the viewport. On phones (< sm) it's a
 * compact list row — small cover left, name + count right — because a
 * full-width square wastes the screen on a derived/placeholder cover. At sm+ it
 * becomes the postcard (square cover, name below) that matches the album grid,
 * with the hover-lift. Liked shows its localized name; user playlists show the
 * typed name.
 *
 * Plain <Link> (prefetch on sight), not HoverPrefetchLink like the album/MV
 * cards: hover-armed prefetch never lands in time for a tap (see
 * hover-prefetch-link.tsx), and a library is a handful of playlists, not the
 * album grid's hundreds. It isn't free — the segment cache keys per URL, so
 * each visible card pulls its own copy of the same id-independent payload
 * (~11KB over 4 requests: _tree, the loading skeleton, __PAGE__, _head); the
 * layout segments above it are fetched once for the whole grid.
 */
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const t = useTranslations("playlists");
  const name = playlist.kind === "liked" ? t("likedSongs") : playlist.name;
  const isJa = playlist.kind === "user" && isJapanese(name);

  return (
    <Link
      href={`/playlists/${playlist.id}`}
      aria-label={name}
      className="group flex items-center gap-3 rounded-xl p-2 outline-none transition duration-300 ease-lazy active:scale-[0.98] max-sm:hover:bg-navy/[0.05] max-sm:active:bg-navy/[0.09] dark:max-sm:hover:bg-white/[0.06] dark:max-sm:active:bg-white/[0.10] sm:block sm:rounded-2xl sm:p-0"
    >
      <PlaylistCover
        playlist={playlist}
        sizes="(max-width: 639px) 56px, 230px"
        className="aspect-square w-14 shrink-0 rounded-lg group-focus-visible:ring-2 group-focus-visible:ring-ring sm:w-full sm:rounded-[14px] sm:shadow-postcard sm:transition sm:duration-500 sm:ease-lazy sm:group-hover:-translate-y-1.5 sm:group-hover:shadow-lift-navy sm:group-focus-visible:-translate-y-1.5 sm:group-focus-visible:ring-offset-2 sm:group-focus-visible:ring-offset-background"
      />
      <div className="min-w-0 flex-1 sm:mt-3">
        <p
          lang={isJa ? "ja" : undefined}
          title={name}
          className="truncate font-display text-[15px] font-semibold text-foreground"
        >
          {name}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t("songCount", { n: playlist.entries.length })}
        </p>
      </div>
    </Link>
  );
}
