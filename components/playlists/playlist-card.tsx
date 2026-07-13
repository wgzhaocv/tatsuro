"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import type { Playlist } from "@/lib/playlists/types";
import { isJapanese } from "@/lib/text";
import { PlaylistCover } from "./playlist-cover";

/** A postcard: square cover + name + song count, links to the playlist. Liked
 *  shows its localized name; user playlists show the typed name. */
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const t = useTranslations("playlists");
  const name = playlist.kind === "liked" ? t("likedSongs") : playlist.name;
  const isJa = playlist.kind === "user" && isJapanese(name);

  return (
    <Link
      href={`/playlists/${playlist.id}`}
      aria-label={name}
      className="group block rounded-2xl focus:outline-none"
    >
      <PlaylistCover
        playlist={playlist}
        sizes="(max-width: 640px) 45vw, 230px"
        className="aspect-square w-full rounded-[14px] shadow-postcard transition duration-500 ease-lazy group-hover:-translate-y-1.5 group-hover:shadow-lift-navy group-focus-visible:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
      />
      <p
        lang={isJa ? "ja" : undefined}
        title={name}
        className="mt-3 truncate font-display text-[15px] font-semibold text-foreground"
      >
        {name}
      </p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {t("songCount", { n: playlist.entries.length })}
      </p>
    </Link>
  );
}
